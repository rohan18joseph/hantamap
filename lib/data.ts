import candidatesJson from "@/data/candidate-reports.json";
import eventsJson from "@/data/events.json";
import locationsGlobalJson from "@/data/locations-global.json";
import manualSourceOverridesJson from "@/data/manual-source-overrides.json";
import reportsJson from "@/data/reports.json";
import { getRenderableEvents } from "@/lib/renderable-events";
import type {
  CandidateReport,
  CountSource,
  EvidenceReport,
  HantamapEvent,
  HantamapReport,
  LocationRecord,
  RelatedLocation,
  ReportFile,
  ReportStatus,
  SourceType,
  Confidence
} from "@/lib/types";

export async function getReportFile(): Promise<{ lastUpdated: string; reports: HantamapReport[] }> {
  const file = reportsJson as ReportFile;
  return { lastUpdated: file.lastUpdated, reports: getRenderableEvents({ sourceMode: "everything", includeCandidates: true }) };
}

export async function getReports(): Promise<HantamapReport[]> {
  return getRenderableEvents({ sourceMode: "everything", includeCandidates: true });
}

export async function getEvidenceReports(): Promise<EvidenceReport[]> {
  return filterEvidence2026(withManualOverrides((reportsJson as ReportFile).reports));
}

export async function getEvidenceReportsAsReports(): Promise<HantamapReport[]> {
  return evidenceToReports(filterEvidence2026(withManualOverrides((reportsJson as ReportFile).reports)), getEventsFromJson());
}

export async function getReport(id: string): Promise<HantamapReport | undefined> {
  const renderable = await getReports();
  const events = getEventReportsFromJson();
  const evidence = evidenceToReports([...filterEvidence2026(withManualOverrides((reportsJson as ReportFile).reports)), ...filterEvidence2026(candidatesJson as CandidateReport[])], getEventsFromJson());
  return [...renderable, ...events, ...evidence].find((report) => report.id === id);
}

export async function getCandidateReports(): Promise<CandidateReport[]> {
  return filterEvidence2026(candidatesJson as CandidateReport[]);
}

export async function getCandidateReportsAsReports(): Promise<HantamapReport[]> {
  return evidenceToReports(filterEvidence2026(candidatesJson as CandidateReport[]), getEventsFromJson());
}

export async function getEvents(): Promise<HantamapEvent[]> {
  return getEventsFromJson();
}

export async function getLocations(): Promise<LocationRecord[]> {
  const locationIndexUsJson = await import("@/data/location-index-us.json");
  return [...(locationIndexUsJson.default as LocationRecord[]), ...(locationsGlobalJson as LocationRecord[])];
}

export function activeReports(reports: HantamapReport[]) {
  return reports.filter((report) =>
    ["confirmed_cluster", "confirmed_case", "active_advisory", "monitoring", "probable"].includes(report.status)
  );
}

export function officialReports(reports: HantamapReport[]) {
  return reports.filter((report) => ["official", "national_health_agency"].includes(report.sourceType));
}

export function isReportInScope2026(report: { reportDate?: string; publishedAt?: string; year?: number }) {
  if (report.year) return report.year === 2026;
  const date = report.reportDate || report.publishedAt || "";
  return date.startsWith("2026-");
}

export function filter2026<T extends { reportDate: string }>(items: T[]) {
  return items.filter(isReportInScope2026);
}

function getEventsFromJson() {
  return (eventsJson as HantamapEvent[]).filter((event) => event.year === 2026 && event.lastUpdated.startsWith("2026-"));
}

function getEventReportsFromJson() {
  return eventsToReports(getEventsFromJson());
}

function filterEvidence2026<T extends EvidenceReport>(items: T[]) {
  return items.filter((item) => item.publishedAt.startsWith("2026-"));
}

function withManualOverrides<T extends EvidenceReport>(reports: T[]) {
  const manualReports = (((manualSourceOverridesJson as unknown as { sources?: EvidenceReport[] }).sources || []).map((report) => ({ ...report, needsReview: report.needsReview ?? false })) as T[]);
  const byId = new Map(reports.map((report) => [report.reportId, report]));
  for (const report of manualReports) byId.set(report.reportId, report);
  return Array.from(byId.values());
}

export function eventsToReports(events: HantamapEvent[]): HantamapReport[] {
  return events.map((event) => {
    const primarySource = event.countSnapshots[0];
    const status = mapEventStatus(event.eventStatus);
    return {
      id: event.eventId,
      eventId: event.eventId,
      title: event.eventName,
      disease: "Hantavirus",
      virusType: event.virusType,
      transmissionType: event.transmissionType,
      status,
      country: event.primaryLocation.country,
      locationName: event.primaryLocation.name,
      latitude: event.primaryLocation.latitude,
      longitude: event.primaryLocation.longitude,
      locationType: event.primaryLocation.locationType,
      caseCount: event.latestOfficialCounts.totalReported ?? event.latestSupplementalCounts.totalReported,
      confirmedCount: event.latestOfficialCounts.confirmed ?? event.latestSupplementalCounts.confirmed,
      deathCount: event.latestOfficialCounts.deaths ?? event.latestSupplementalCounts.deaths,
      sourceName: primarySource?.sourceName || "Hantamap curated event",
      sourceUrl: primarySource?.sourceUrl || "#",
      sourceType: (primarySource?.sourceType || "discovery") as SourceType,
      confidence: (primarySource?.confidence || "unverified") as Confidence,
      corroborationStatus: event.corroborationStatus,
      reportDate: event.lastUpdated,
      lastVerified: event.lastUpdated,
      summary: event.summary,
      caseCounts: event.latestOfficialCounts.totalReported !== null || event.latestOfficialCounts.confirmed !== null
        ? event.latestOfficialCounts
        : event.latestSupplementalCounts,
      countSources: event.countSnapshots,
      relatedLocations: event.locations.map(eventLocationToRelated)
    };
  });
}

export function evidenceToReports(evidence: EvidenceReport[], events: HantamapEvent[]): HantamapReport[] {
  const eventById = new Map(events.map((event) => [event.eventId, event]));
  return evidence.map((report) => {
    const event = eventById.get(report.eventId);
    const firstLocation = report.locationMentions.find((location) => location.latitude !== null && location.longitude !== null);
    const fallback = event?.primaryLocation;
    const latitude = firstLocation?.latitude ?? fallback?.latitude ?? 20;
    const longitude = firstLocation?.longitude ?? fallback?.longitude ?? 0;
    return {
      id: report.reportId,
      eventId: report.eventId,
      title: report.title,
      disease: "Hantavirus",
      virusType: event?.virusType || "Unknown",
      transmissionType: event?.transmissionType || "unknown",
      status: report.needsReview ? "supplemental_update" : mapEventStatus(event?.eventStatus || "supplemental"),
      country: firstLocation?.country || fallback?.country || "Global",
      locationName: firstLocation?.name || fallback?.name || "Global reporting area",
      latitude,
      longitude,
      locationType: firstLocation?.role || fallback?.locationType || "advisory_region",
      caseCount: report.extractedCounts.totalReported,
      confirmedCount: report.extractedCounts.confirmed,
      deathCount: report.extractedCounts.deaths,
      sourceName: report.sourceName,
      sourceUrl: report.sourceUrl,
      sourceType: report.sourceType,
      confidence: report.confidence,
      corroborationStatus: report.needsReview ? "needs_review" : event?.corroborationStatus || "single_source",
      reportDate: report.publishedAt,
      lastVerified: report.retrievedAt,
      summary: report.summary,
      caseCounts: report.extractedCounts,
      countSources: [evidenceToCountSource(report), ...(event?.countSnapshots || [])],
      relatedLocations: report.locationMentions.map((location) => ({
        type: location.role,
        name: location.name,
        country: location.country,
        latitude: location.latitude ?? latitude,
        longitude: location.longitude ?? longitude,
        date: report.publishedAt,
        description: `${location.role.replaceAll("_", " ")} mentioned by ${report.sourceName}.`,
        sourceUrl: report.sourceUrl
      }))
    };
  });
}

function mapEventStatus(status: HantamapEvent["eventStatus"]): ReportStatus {
  switch (status) {
    case "confirmed":
      return "confirmed_cluster";
    case "probable":
      return "probable";
    case "suspected":
      return "suspected";
    case "active_advisory":
      return "active_advisory";
    case "monitoring":
      return "monitoring";
    case "historical":
      return "historical";
    default:
      return "supplemental_update";
  }
}

function eventLocationToRelated(location: HantamapEvent["locations"][number]): RelatedLocation {
  return {
    type: location.locationType,
    name: location.name,
    country: location.country,
    latitude: location.latitude,
    longitude: location.longitude,
    date: "2026-01-01",
    description: location.description,
    sourceUrl: location.sourceUrls[0] || "#"
  };
}

function evidenceToCountSource(report: EvidenceReport): CountSource {
  return {
    sourceName: report.sourceName,
    sourceUrl: report.sourceUrl,
    sourceType: report.sourceType,
    confidence: report.confidence,
    reportedAt: report.publishedAt,
    counts: report.extractedCounts,
    notes: report.summary
  };
}
