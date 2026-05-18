import type { CaseCounts, CountSource, HantamapReport, SourceType } from "@/lib/types";

export type SourceFilterMode = "official" | "official_local" | "supplemental" | "everything" | "needs_review";

export const sourceFilterOptions: Array<{ id: SourceFilterMode; label: string; description: string }> = [
  { id: "official", label: "Official only", description: "WHO, CDC, ECDC, and national public-health agencies." },
  { id: "official_local", label: "Official + local/health system", description: "Official sources plus state/local health departments and health systems." },
  { id: "supplemental", label: "Supplemental", description: "News and third-party reports only." },
  { id: "everything", label: "Everything", description: "Official, local health, moderated, supplemental news, and location-resolved discovery clusters." },
  { id: "needs_review", label: "Needs review", description: "Discovery and candidate records needing review." }
];

const officialTypes = new Set<SourceType>(["official", "national_health_agency"]);
const localHealthTypes = new Set<SourceType>(["state_health_department", "local_health_department", "health_system"]);

export function reportMatchesSourceMode(report: HantamapReport, mode: SourceFilterMode) {
  switch (mode) {
    case "official":
      return officialTypes.has(report.sourceType);
    case "official_local":
      return officialTypes.has(report.sourceType) || localHealthTypes.has(report.sourceType);
    case "everything":
      return true;
    case "supplemental":
      return report.sourceType === "supplemental_news";
    case "needs_review":
      return report.sourceType === "discovery" || report.corroborationStatus === "needs_review";
  }
}

export function isSupplementalMode(mode: SourceFilterMode) {
  return mode === "everything" || mode === "supplemental" || mode === "needs_review";
}

export function eventKey(report: HantamapReport) {
  return report.eventId || report.id;
}

export function dedupeByEvent(reports: HantamapReport[]) {
  const byEvent = new Map<string, HantamapReport>();
  for (const report of reports) {
    const current = byEvent.get(eventKey(report));
    if (!current || rankReport(report) > rankReport(current) || (rankReport(report) === rankReport(current) && report.reportDate > current.reportDate)) {
      byEvent.set(eventKey(report), report);
    }
  }
  return Array.from(byEvent.values());
}

export function collectCountSources(reports: HantamapReport[]) {
  const sources = reports.flatMap((report) => report.countSources?.length ? report.countSources : [countSourceFromReport(report)]);
  return [...sources].sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
}

export function latestOfficialCounts(reports: HantamapReport[]) {
  return latestCountsBySource(reports, (source) => officialTypes.has(source.sourceType as SourceType));
}

export function latestSupplementalCounts(reports: HantamapReport[]) {
  return latestCountsBySource(reports, (source) => ["state_health_department", "local_health_department", "health_system", "moderated", "supplemental_news", "discovery"].includes(String(source.sourceType)));
}

export function latestCountsBySource(reports: HantamapReport[], predicate: (source: CountSource) => boolean) {
  return collectCountSources(reports).find(predicate)?.counts || emptyCounts();
}

export function countValue(report: HantamapReport, key: keyof CaseCounts) {
  return report.caseCounts?.[key] ?? null;
}

export function primaryCount(report: HantamapReport) {
  return report.caseCounts?.totalReported ?? report.caseCounts?.confirmed ?? report.caseCount ?? null;
}

export function countLabel(value: number | null | undefined) {
  return value === null || value === undefined ? "No count" : String(value);
}

export function hasCount(report: HantamapReport, key: keyof CaseCounts) {
  const value = countValue(report, key);
  return typeof value === "number" && value > 0;
}

function rankReport(report: HantamapReport) {
  const sourceRank = report.sourceType === "official" || report.sourceType === "national_health_agency" ? 100 : localHealthTypes.has(report.sourceType) ? 75 : report.sourceType === "moderated" ? 50 : report.sourceType === "supplemental_news" ? 20 : 0;
  const confidenceRank = report.confidence === "high" ? 10 : report.confidence === "medium" ? 5 : report.confidence === "low" ? 2 : 0;
  return sourceRank + confidenceRank;
}

function countSourceFromReport(report: HantamapReport): CountSource {
  return {
    sourceName: report.sourceName,
    sourceUrl: report.sourceUrl,
    sourceType: report.sourceType,
    confidence: report.confidence,
    reportedAt: report.reportDate,
    counts: report.caseCounts || emptyCounts(),
    notes: report.summary
  };
}

export function emptyCounts(): CaseCounts {
  return {
    confirmed: null,
    presumptivePositive: null,
    pendingConfirmation: null,
    inconclusive: null,
    suspected: null,
    probable: null,
    screened: null,
    symptomatic: null,
    asymptomatic: null,
    negative: null,
    deaths: null,
    hospitalized: null,
    critical: null,
    quarantined: null,
    monitored: null,
    recovered: null,
    clearedNegative: null,
    totalReported: null
  };
}
