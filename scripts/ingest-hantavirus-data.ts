import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Confidence = "high" | "medium" | "supplemental";
type TransmissionType = "rodentborne" | "person_to_person_possible" | "unknown";
type LocationType =
  | "exposure_location"
  | "case_residence"
  | "hospital_location"
  | "quarantine_location"
  | "travel_route"
  | "advisory_region";

type HantamapReport = {
  id: string;
  title: string;
  virusType: string;
  transmissionType: TransmissionType;
  status: string;
  country: string;
  locationName: string;
  latitude: number;
  longitude: number;
  locationType: LocationType;
  caseCount: number;
  deathCount: number;
  sourceName: string;
  sourceUrl: string;
  sourceType: string;
  confidence: Confidence;
  reportDate: string;
  lastVerified: string;
  summary: string;
};

type ReportFile = {
  lastUpdated: string;
  reports: HantamapReport[];
};

type IngestionLog = {
  lastRun: string;
  sourceResults: SourceResult[];
  newReports: string[];
  updatedReports: string[];
  unchangedReports: string[];
  failedSources: SourceResult[];
  totalReports: number;
  totalActiveReports: number;
};

type SourceResult = {
  name: string;
  url: string;
  ok: boolean;
  status?: number;
  matchedItems?: number;
  discoveredUrls?: number;
  error?: string;
};

type Source = {
  name: string;
  url: string;
  sourceName: string;
  sourceType: string;
  confidence: Confidence;
  discoverLinks: boolean;
};

type Candidate = {
  title: string;
  url: string;
  text: string;
  sourceName: string;
  sourceType: string;
  confidence: Confidence;
};

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const REPORTS_PATH = join(ROOT, "data", "reports.json");
const LOG_PATH = join(ROOT, "data", "ingestion-log.json");
const DIGEST_PATH = join(ROOT, "reports", "daily-digest.md");

const SEARCH_TERMS = [
  "hantavirus",
  "andes virus",
  "hantavirus pulmonary syndrome",
  "hps",
  "mv hondius",
  "m/v hondius",
  "cruise ship"
];

const SOURCES: Source[] = [
  {
    name: "WHO Disease Outbreak News",
    url: "https://www.who.int/emergencies/disease-outbreak-news",
    sourceName: "World Health Organization",
    sourceType: "official_global_health_advisory",
    confidence: "high",
    discoverLinks: true
  },
  {
    name: "WHO DON600",
    url: "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON600",
    sourceName: "World Health Organization",
    sourceType: "official_global_health_advisory",
    confidence: "high",
    discoverLinks: false
  },
  {
    name: "WHO DON599",
    url: "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON599",
    sourceName: "World Health Organization",
    sourceType: "official_global_health_advisory",
    confidence: "high",
    discoverLinks: false
  },
  {
    name: "CDC Hantavirus Current Situation",
    url: "https://www.cdc.gov/hantavirus/",
    sourceName: "Centers for Disease Control and Prevention",
    sourceType: "official_public_health_reference",
    confidence: "high",
    discoverLinks: true
  },
  {
    name: "CDC Hantavirus Reported Cases",
    url: "https://www.cdc.gov/hantavirus/data-research/cases/index.html",
    sourceName: "Centers for Disease Control and Prevention",
    sourceType: "official_surveillance_summary",
    confidence: "high",
    discoverLinks: false
  },
  {
    name: "CDC HAN notices",
    url: "https://www.cdc.gov/han/site.html",
    sourceName: "Centers for Disease Control and Prevention",
    sourceType: "official_health_alert_network",
    confidence: "high",
    discoverLinks: true
  },
  {
    name: "CDC M/V Hondius statement",
    url: "https://www.cdc.gov/media/releases/2026-hantavirus-confirmed-cruise-ship.html",
    sourceName: "Centers for Disease Control and Prevention",
    sourceType: "official_public_health_statement",
    confidence: "high",
    discoverLinks: false
  },
  {
    name: "ECDC hantavirus infection",
    url: "https://www.ecdc.europa.eu/en/hantavirus-infection",
    sourceName: "European Centre for Disease Prevention and Control",
    sourceType: "official_public_health_assessment",
    confidence: "high",
    discoverLinks: true
  },
  {
    name: "ECDC hantavirus publications",
    url: "https://www.ecdc.europa.eu/en/publications-data/hantavirus-infection-annual-epidemiological-report-2023",
    sourceName: "European Centre for Disease Prevention and Control",
    sourceType: "official_surveillance_summary",
    confidence: "high",
    discoverLinks: false
  },
  {
    name: "ProMED latest posts",
    url: "https://www.promedmail.org/?lang=en",
    sourceName: "ProMED",
    sourceType: "public_outbreak_reporting",
    confidence: "medium",
    discoverLinks: true
  }
];

const STATIC_FALLBACK_URLS = [
  "https://www.ecdc.europa.eu/en/news-events/ecdc-publishes-guidance-management-passengers-linked-andes-hantavirus-outbreak-cruise",
  "https://www.ecdc.europa.eu/en/publications-data/rapid-scientific-advice-management-passengers-context-andes-virus-outbreak-cruise"
];

const args = new Set(process.argv.slice(2));
const digestOnly = args.has("--digest-only");

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await ensureDirs();
  const now = new Date().toISOString();

  if (digestOnly) {
    const reportsFile = await readReportsFile();
    const previousLog = await readPreviousLog(now, reportsFile);
    await writeDigest(reportsFile, previousLog);
    return;
  }

  const existing = await readReportsFile();
  const { candidates, sourceResults } = await fetchCandidates();
  const incoming = dedupeReports(candidates.map((candidate) => normalizeCandidate(candidate, now)));
  const merge = mergeReports(pruneNonReportRecords(existing.reports), incoming);
  const nextReports: ReportFile = {
    lastUpdated: now,
    reports: merge.reports.sort(sortReports)
  };
  const log: IngestionLog = {
    lastRun: now,
    sourceResults,
    newReports: merge.newReports,
    updatedReports: merge.updatedReports,
    unchangedReports: merge.unchangedReports,
    failedSources: sourceResults.filter((result) => !result.ok),
    totalReports: nextReports.reports.length,
    totalActiveReports: countActive(nextReports.reports)
  };

  await writeJson(REPORTS_PATH, nextReports);
  await writeJson(LOG_PATH, log);
  await writeDigest(nextReports, log);
  console.log(`Ingested ${incoming.length} matching item(s). ${merge.newReports.length} new, ${merge.updatedReports.length} updated.`);
}

async function fetchCandidates() {
  const candidates: Candidate[] = [];
  const sourceResults: SourceResult[] = [];
  const queued = new Map<string, Source>();

  for (const source of SOURCES) {
    queued.set(source.url, source);
  }

  for (const fallbackUrl of STATIC_FALLBACK_URLS) {
    queued.set(fallbackUrl, {
      name: `Static known source: ${fallbackUrl}`,
      url: fallbackUrl,
      sourceName: "European Centre for Disease Prevention and Control",
      sourceType: "official_public_health_assessment",
      confidence: "high",
      discoverLinks: false
    });
  }

  for (const [url, source] of queued) {
    const result: SourceResult = { name: source.name, url, ok: false };

    try {
      const response = await fetchWithTimeout(url);
      result.status = response.status;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      const text = htmlToText(html);
      const title = extractTitle(html) || source.name;
      const pageMatches = matchesTerms(`${title} ${text}`);
      const links = source.discoverLinks ? discoverLinks(html, url) : [];
      const matchingLinks = links.filter((link) => matchesTerms(`${link.title} ${link.url}`)).slice(0, 16);

      result.discoveredUrls = matchingLinks.length;
      result.matchedItems = pageMatches ? 1 : 0;

      const pageCandidate = {
        title,
        url,
        text,
        sourceName: source.sourceName,
        sourceType: source.sourceType,
        confidence: source.confidence
      };

      if (pageMatches && isReportLikeCandidate(pageCandidate)) {
        candidates.push(pageCandidate);
      }

      for (const link of matchingLinks) {
        if (link.url === url) continue;
        try {
          const childResponse = await fetchWithTimeout(link.url);
          if (!childResponse.ok) continue;
          const childHtml = await childResponse.text();
          const childText = htmlToText(childHtml);
          const childTitle = extractTitle(childHtml) || link.title;
          if (!matchesTerms(`${childTitle} ${childText}`)) continue;
          const candidate = {
            title: childTitle,
            url: link.url,
            text: childText,
            sourceName: source.sourceName,
            sourceType: source.sourceType,
            confidence: source.confidence
          };
          if (!isReportLikeCandidate(candidate)) continue;
          candidates.push(candidate);
          result.matchedItems = (result.matchedItems || 0) + 1;
        } catch {
          // Child links are opportunistic. The parent source result still captures source health.
        }
      }

      result.ok = true;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    }

    sourceResults.push(result);
  }

  return { candidates, sourceResults };
}

function normalizeCandidate(candidate: Candidate, now: string): HantamapReport {
  const compactText = collapseWhitespace(candidate.text);
  const lower = compactText.toLowerCase();
  const date = extractDate(compactText) || todayDate(now);
  const location = inferLocation(`${candidate.title} ${compactText}`);
  const counts = inferCounts(compactText);
  const virusType = inferVirusType(lower);
  const transmissionType = inferTransmissionType(lower, virusType);
  const status = inferStatus(candidate, date, now);
  const title = inferTitle(candidate);

  return {
    id: slug(`${candidate.sourceName}-${title}-${date}`),
    title,
    virusType,
    transmissionType,
    status,
    country: location.country,
    locationName: location.locationName,
    latitude: location.latitude,
    longitude: location.longitude,
    locationType: location.locationType,
    caseCount: counts.caseCount,
    deathCount: counts.deathCount,
    sourceName: candidate.sourceName,
    sourceUrl: candidate.url,
    sourceType: candidate.sourceType,
    confidence: candidate.confidence,
    reportDate: date,
    lastVerified: todayDate(now),
    summary: buildSummary(compactText, candidate)
  };
}

function inferTitle(candidate: Candidate) {
  const title = cleanTitle(candidate.title);
  if (candidate.sourceName === "ProMED" && /protecting global health/i.test(title)) {
    return "ProMED latest hantavirus posts";
  }
  return title;
}

function isReportLikeCandidate(candidate: Candidate) {
  const haystack = `${candidate.title} ${candidate.url}`.toLowerCase();
  if (isGenericEducationUrl(candidate.url, candidate.title)) return false;

  return [
    "disease-outbreak-news",
    "don599",
    "don600",
    "situation-summary",
    "reported cases",
    "data-research/cases",
    "han005",
    "media/releases/2026-hantavirus",
    "news-events",
    "publications-data",
    "annual epidemiological report",
    "rapid scientific advice",
    "assessment",
    "surveillance-and-updates/andes-hantavirus-outbreak",
    "promedmail"
  ].some((signal) => haystack.includes(signal));
}

function pruneNonReportRecords(reports: HantamapReport[]) {
  return reports.filter((report) => !isGenericEducationUrl(report.sourceUrl, report.title));
}

function isGenericEducationUrl(url: string, title: string) {
  const haystack = `${url} ${title}`.toLowerCase();
  return [
    "/about/",
    "/prevention/",
    "/hcp/clinical-overview",
    "/hcp/animals",
    "/hcp/training",
    "/faq/",
    "/toolkit/",
    "/site.html",
    "about hantavirus",
    "fact-sheets/detail/hantavirus",
    "factsheet-orthohantavirus",
    "case definition and reporting"
  ].some((signal) => haystack.includes(signal));
}

function mergeReports(existing: HantamapReport[], incoming: HantamapReport[]) {
  const reports = [...existing];
  const newReports: string[] = [];
  const updatedReports: string[] = [];
  const unchangedReports: string[] = [];

  for (const report of incoming) {
    const matchIndex = reports.findIndex((existingReport) => isSameReport(existingReport, report));
    if (matchIndex === -1) {
      reports.push(report);
      newReports.push(report.id);
      continue;
    }

    const existingReport = reports[matchIndex];
    const sameUrl = normalizeUrl(existingReport.sourceUrl) === normalizeUrl(report.sourceUrl);
    const newer = new Date(report.reportDate).getTime() > new Date(existingReport.reportDate).getTime();

    if (sameUrl && newer) {
      reports[matchIndex] = {
        ...report,
        id: existingReport.id || report.id
      };
      updatedReports.push(reports[matchIndex].id);
    } else {
      unchangedReports.push(existingReport.id);
    }
  }

  return {
    reports: dedupeReports(reports),
    newReports,
    updatedReports,
    unchangedReports: Array.from(new Set(unchangedReports))
  };
}

function dedupeReports(reports: HantamapReport[]) {
  const byKey = new Map<string, HantamapReport>();
  for (const report of reports) {
    const key = normalizeUrl(report.sourceUrl) || normalizeTitle(report.title);
    const existing = byKey.get(key);
    if (
      !existing ||
      new Date(report.reportDate) > new Date(existing.reportDate) ||
      (report.reportDate === existing.reportDate && reportRank(report) > reportRank(existing))
    ) {
      byKey.set(key, report);
    }
  }
  return Array.from(byKey.values());
}

function reportRank(report: HantamapReport) {
  let rank = 0;
  if (report.sourceType.includes("surveillance")) rank += 4;
  if (report.sourceType.includes("advisory") || report.sourceType.includes("assessment")) rank += 3;
  if (report.sourceType.includes("statement")) rank += 2;
  if (report.confidence === "high") rank += 2;
  if (!isGenericEducationUrl(report.sourceUrl, report.title)) rank += 1;
  return rank;
}

async function writeDigest(reportsFile: ReportFile, log: IngestionLog) {
  const reportById = new Map(reportsFile.reports.map((report) => [report.id, report]));
  const newReports = log.newReports.map((id) => reportById.get(id)).filter(Boolean) as HantamapReport[];
  const updatedReports = log.updatedReports.map((id) => reportById.get(id)).filter(Boolean) as HantamapReport[];
  const activeReports = reportsFile.reports.filter(isActiveReport);

  const lines = [
    "# Hantamap Daily Digest",
    "",
    `Last ingestion timestamp: ${log.lastRun}`,
    `Total active reports: ${activeReports.length}`,
    `Total records: ${reportsFile.reports.length}`,
    "",
    "## New Reports",
    ...formatDigestReports(newReports),
    "",
    "## Updated Reports",
    ...formatDigestReports(updatedReports),
    "",
    "## Source Fetch Notes",
    ...log.sourceResults.map((result) => {
      const status = result.ok ? "ok" : "failed";
      const detail = result.error ? ` - ${result.error}` : "";
      return `- ${status}: ${result.name} (${result.url})${detail}`;
    }),
    ""
  ];

  await writeFile(DIGEST_PATH, lines.join("\n"), "utf8");
}

function formatDigestReports(reports: HantamapReport[]) {
  if (!reports.length) return ["- None"];
  return reports.map((report) => `- ${report.title} (${report.reportDate}) - ${report.sourceName}: ${report.sourceUrl}`);
}

async function readReportsFile(): Promise<ReportFile> {
  try {
    const raw = await readFile(REPORTS_PATH, "utf8");
    const parsed = JSON.parse(raw) as ReportFile;
    return {
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      reports: Array.isArray(parsed.reports) ? parsed.reports : []
    };
  } catch {
    return { lastUpdated: new Date().toISOString(), reports: [] };
  }
}

async function readPreviousLog(now: string, reportsFile: ReportFile): Promise<IngestionLog> {
  try {
    return JSON.parse(await readFile(LOG_PATH, "utf8")) as IngestionLog;
  } catch {
    return {
      lastRun: now,
      sourceResults: [],
      newReports: [],
      updatedReports: [],
      unchangedReports: [],
      failedSources: [],
      totalReports: reportsFile.reports.length,
      totalActiveReports: countActive(reportsFile.reports)
    };
  }
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, {
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "user-agent": "HantamapDataIngestion/1.0 (+https://hantamap.local)"
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function discoverLinks(html: string, baseUrl: string) {
  const links: { title: string; url: string }[] = [];
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const href = decodeHtml(match[1] || "");
    const title = htmlToText(match[2] || "");
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) continue;
    try {
      const url = new URL(href, baseUrl).toString();
      links.push({ title: title || url, url });
    } catch {
      continue;
    }
  }
  return uniqueBy(links, (link) => normalizeUrl(link.url));
}

function htmlToText(html: string) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function extractTitle(html: string) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const title = h1 || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  return cleanTitle(htmlToText(title));
}

function cleanTitle(title: string) {
  return collapseWhitespace(title.replace(/\s*\|\s*.*?(CDC|WHO|ECDC).*$/i, "")).slice(0, 180);
}

function matchesTerms(value: string) {
  const lower = value.toLowerCase();
  return SEARCH_TERMS.some((term) => lower.includes(term));
}

function inferVirusType(lower: string) {
  if (lower.includes("andes")) return "Andes virus";
  if (lower.includes("sin nombre")) return "Sin Nombre virus";
  if (lower.includes("puumala")) return "Puumala virus";
  if (lower.includes("seoul virus")) return "Seoul virus";
  return "Hantavirus";
}

function inferTransmissionType(lower: string, virusType: string): TransmissionType {
  if (virusType === "Andes virus" || lower.includes("person-to-person") || lower.includes("human-to-human")) {
    return "person_to_person_possible";
  }
  if (lower.includes("rodent") || lower.includes("deer mouse") || lower.includes("excreta")) return "rodentborne";
  return "unknown";
}

function inferStatus(candidate: Candidate, date: string, now: string) {
  const lower = `${candidate.title} ${candidate.text}`.toLowerCase();
  const ageDays = Math.floor((new Date(now).getTime() - new Date(date).getTime()) / 86400000);
  if (candidate.sourceType.includes("surveillance") || lower.includes("annual epidemiological report")) {
    return "historical_regional_activity";
  }
  if (ageDays <= 60 && /(outbreak|advisory|alert|response|current|confirmed|cluster)/i.test(lower)) {
    if (candidate.confidence === "medium" || candidate.sourceName === "ProMED") return "verified_report";
    return candidate.sourceType.includes("advisory") ? "active_advisory" : "official_advisory";
  }
  return ageDays <= 180 ? "verified_report" : "historical_verified";
}

function inferLocation(value: string): Pick<HantamapReport, "country" | "locationName" | "latitude" | "longitude" | "locationType"> {
  const lower = value.toLowerCase();
  if (lower.includes("hondius") || lower.includes("cruise ship") || lower.includes("cabo verde") || lower.includes("cape verde")) {
    return {
      country: "Multi-country",
      locationName: "M/V Hondius near Cabo Verde / South Atlantic travel route",
      latitude: 16.5388,
      longitude: -23.0418,
      locationType: "travel_route"
    };
  }
  if (lower.includes("ushuaia") || lower.includes("argentina")) {
    return {
      country: "Argentina",
      locationName: "Argentina / Andes virus regional context",
      latitude: -38.4161,
      longitude: -63.6167,
      locationType: "advisory_region"
    };
  }
  if (lower.includes("europe") || lower.includes("eu/eea") || lower.includes("ecdc")) {
    return {
      country: "Europe",
      locationName: "EU/EEA hantavirus surveillance region",
      latitude: 54.526,
      longitude: 15.2551,
      locationType: "advisory_region"
    };
  }
  if (lower.includes("united states") || lower.includes("cdc")) {
    return {
      country: "United States",
      locationName: "United States public-health reporting region",
      latitude: 39.8283,
      longitude: -98.5795,
      locationType: "advisory_region"
    };
  }
  return {
    country: "Global",
    locationName: "Global public-health reporting region",
    latitude: 20,
    longitude: 0,
    locationType: "advisory_region"
  };
}

function inferCounts(text: string) {
  const lower = text.toLowerCase();
  const caseCount =
    findCount(lower, /(?:total of\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:confirmed\s+|laboratory-confirmed\s+|probable\s+|suspected\s+)?cases?/) ||
    findCount(lower, /cases?\D{0,30}(\d+)/) ||
    0;
  const deathCount =
    findCount(lower, /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+deaths?/) ||
    findCount(lower, /including\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+deaths?/) ||
    0;
  return { caseCount, deathCount };
}

function findCount(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  if (!match) return 0;
  return wordToNumber(match[1]);
}

function wordToNumber(value: string) {
  const words: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10
  };
  return Number(value) || words[value.toLowerCase()] || 0;
}

function extractDate(text: string) {
  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];
  if (iso) return iso;

  const longDate = text.match(/\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+20\d{2})\b/i)?.[1];
  if (longDate) return toIsoDate(longDate);

  const usDate = text.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},\s+20\d{2})\b/i)?.[1];
  if (usDate) return toIsoDate(usDate);

  return "";
}

function toIsoDate(value: string) {
  const date = new Date(value.replace(/\./g, ""));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function buildSummary(text: string, candidate?: Candidate) {
  if (candidate?.sourceName === "ProMED") {
    const promedItems = text.match(/HANTAVIR(?:US|OSE)[^.]{0,220}/gi);
    if (promedItems?.length) return collapseWhitespace(promedItems.slice(0, 3).join("; ")).slice(0, 500);
  }

  const sentences = collapseWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => matchesTerms(sentence));
  const summary = sentences.slice(0, 2).join(" ") || collapseWhitespace(text).slice(0, 320);
  return summary.slice(0, 500);
}

function sortReports(a: HantamapReport, b: HantamapReport) {
  return new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime() || a.title.localeCompare(b.title);
}

function isSameReport(a: HantamapReport, b: HantamapReport) {
  return normalizeUrl(a.sourceUrl) === normalizeUrl(b.sourceUrl) || normalizeTitle(a.title) === normalizeTitle(b.title);
}

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.searchParams.sort();
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim().toLowerCase();
  }
}

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function todayDate(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function isActiveReport(report: HantamapReport) {
  return report.status === "active_advisory" || report.status === "official_advisory" || report.status === "verified_report";
}

function countActive(reports: HantamapReport[]) {
  return reports.filter(isActiveReport).length;
}

function uniqueBy<T>(items: T[], keyFn: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function ensureDirs() {
  await mkdir(dirname(REPORTS_PATH), { recursive: true });
  await mkdir(dirname(DIGEST_PATH), { recursive: true });
}
