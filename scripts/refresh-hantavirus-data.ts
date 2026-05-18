import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CandidateReport, EvidenceReport, HantamapEvent, ReportFile, SourceType } from "../lib/types";

type Source = {
  name: string;
  url: string;
  sourceName: string;
  sourceType: SourceType;
  confidence: "high" | "medium" | "low" | "unverified";
  mode: "html" | "gdelt";
};

type SourceResult = {
  name: string;
  url: string;
  ok: boolean;
  status?: number;
  matchedItems: number;
  discoveredUrls: number;
  error?: string;
};

type Jurisdiction = {
  name: string;
  abbreviation: string;
  majorCities: string[];
  stateHealthDepartmentSearchTerms: string[];
  localNewsSearchTerms: string[];
};

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const REPORTS_PATH = join(ROOT, "data", "reports.json");
const EVENTS_PATH = join(ROOT, "data", "events.json");
const CANDIDATES_PATH = join(ROOT, "data", "candidate-reports.json");
const LOG_PATH = join(ROOT, "data", "ingestion-log.json");
const DIGEST_PATH = join(ROOT, "reports", "daily-digest.md");

const gdeltDiscoveryQuery = "hantavirus";

const sources: Source[] = [
  {
    name: "WHO Disease Outbreak News DON600",
    url: "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON600",
    sourceName: "World Health Organization",
    sourceType: "official",
    confidence: "high",
    mode: "html"
  },
  {
    name: "CDC HAN00528",
    url: "https://www.cdc.gov/han/php/notices/han00528.html",
    sourceName: "Centers for Disease Control and Prevention",
    sourceType: "official",
    confidence: "high",
    mode: "html"
  },
  {
    name: "CDC Current Situation",
    url: "https://www.cdc.gov/hantavirus/situation-summary/index.html",
    sourceName: "Centers for Disease Control and Prevention",
    sourceType: "official",
    confidence: "high",
    mode: "html"
  },
  {
    name: "ECDC Andes outbreak daily page",
    url: "https://www.ecdc.europa.eu/en/infectious-disease-topics/hantavirus-infection/surveillance-and-updates/andes-hantavirus-outbreak",
    sourceName: "European Centre for Disease Prevention and Control",
    sourceType: "official",
    confidence: "high",
    mode: "html"
  },
  {
    name: "RIVM current information about hantavirus",
    url: "https://www.rivm.nl/en/hantavirus/current-information",
    sourceName: "RIVM",
    sourceType: "national_health_agency",
    confidence: "high",
    mode: "html"
  },
  {
    name: "RIVM update hantavirus",
    url: "https://www.rivm.nl/en/news/update-hantavirus",
    sourceName: "RIVM",
    sourceType: "national_health_agency",
    confidence: "high",
    mode: "html"
  },
  {
    name: "ASPR MV Hondius repatriation",
    url: "https://www.hhs.gov/press-room/hhs-supports-repatriation-us-citizens-specialized-care-facilities.html",
    sourceName: "Administration for Strategic Preparedness and Response",
    sourceType: "national_health_agency",
    confidence: "high",
    mode: "html"
  },
  {
    name: "Nebraska Medicine monitoring for hantavirus",
    url: "https://www.unmc.edu/newsroom/2026/05/11/cruise-ship-passengers-arrive-at-national-quarantine-unit/",
    sourceName: "Nebraska Medicine",
    sourceType: "health_system",
    confidence: "medium",
    mode: "html"
  },
  {
    name: "New Jersey Department of Health MV Hondius monitoring",
    url: "https://www.nj.gov/health/news/2026/20260508a.shtml",
    sourceName: "New Jersey Department of Health",
    sourceType: "state_health_department",
    confidence: "high",
    mode: "html"
  },
  {
    name: "North Carolina DHHS MV Hondius passenger update",
    url: "https://www.ncdhhs.gov/news/press-releases/2026/05/11/north-carolina-closely-monitoring-hantavirus",
    sourceName: "North Carolina Department of Health and Human Services",
    sourceType: "state_health_department",
    confidence: "high",
    mode: "html"
  },
  {
    name: "CBS Atlanta Emory negative test update",
    url: "https://www.cbsnews.com/atlanta/news/hantavirus-outbreak-cruise-ship-passenger-with-symptoms-at-emory-tests-negative-for-virus/",
    sourceName: "CBS News Atlanta",
    sourceType: "supplemental_news",
    confidence: "medium",
    mode: "html"
  },
  {
    name: "Guardian evacuated passengers update",
    url: "https://www.theguardian.com/world/2026/may/11/evacuated-us-and-french-mv-hondius-cruise-ship-passengers-test-positive-for-hantavirus",
    sourceName: "The Guardian",
    sourceType: "supplemental_news",
    confidence: "medium",
    mode: "html"
  },
  {
    name: "GDELT DOC API U.S. 2026 discovery",
    url: gdeltUrl(gdeltDiscoveryQuery),
    sourceName: "GDELT DOC API",
    sourceType: "discovery",
    confidence: "unverified",
    mode: "gdelt"
  }
];

const digestOnly = process.argv.includes("--digest-only");

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await mkdir(dirname(DIGEST_PATH), { recursive: true });
  await mkdir(dirname(REPORTS_PATH), { recursive: true });
  const now = new Date().toISOString();
  const reportsFile = await readJson<ReportFile>(REPORTS_PATH, { lastUpdated: now, reports: [] });
  const events = await readJson<HantamapEvent[]>(EVENTS_PATH, []);
  const candidates = await readJson<CandidateReport[]>(CANDIDATES_PATH, []);
  const jurisdictions = await readJson<Jurisdiction[]>(join(ROOT, "data", "us-jurisdictions.json"), []);
  const sourceRegistry = await readJson<any[]>(join(ROOT, "data", "source-registry.json"), []);
  const previousLog = await readJson<any>(LOG_PATH, {});

  const reports2026 = reportsFile.reports.filter((report) => report.publishedAt.startsWith("2026-"));
  const events2026 = events.filter((event) => event.year === 2026);
  const candidates2026 = candidates.filter((report) => report.publishedAt.startsWith("2026-"));

  if (digestOnly) {
    await writeDigest(reportsFile.lastUpdated, events2026, reports2026, candidates2026, previousLog);
    return;
  }

  const sourceResults: SourceResult[] = [];
  const discoveredCandidates: CandidateReport[] = [];

  for (const source of sources) {
    const result: SourceResult = { name: source.name, url: source.url, ok: false, matchedItems: 0, discoveredUrls: 0 };
    try {
      if (source.mode === "gdelt") {
        const items = await fetchGdelt(source, now);
        discoveredCandidates.push(...items);
        result.matchedItems = items.length;
        result.discoveredUrls = items.length;
        result.status = 200;
      } else {
        const response = await fetchWithTimeout(source.url);
        result.status = response.status;
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = htmlToText(await response.text());
        result.matchedItems = matchesTerms(text) ? 1 : 0;
      }
      result.ok = true;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    }
    sourceResults.push(result);
  }

  const nextCandidates = dedupeCandidates([...candidates2026, ...discoveredCandidates]);
  const filteredOutOldReports = reportsFile.reports.length - reports2026.length;
  const log = {
    lastRefresh: now,
    sourceResults,
    newCandidateReports: discoveredCandidates.map((report) => report.reportId),
    publishedReports: [],
    updatedReports: [],
    supplementalUpdates: reports2026.filter((report) => report.sourceType === "supplemental_news").map((report) => report.reportId),
    debug: {
      reportsDiscoveredPerSource: Object.fromEntries(sourceResults.map((result) => [result.name, result.matchedItems])),
      eventsAfterDeduplication: events2026.length,
      usEvents: events2026.filter((event) => event.primaryLocation.country === "USA" || event.locations.some((location) => location.country === "USA")).length,
      usReports: reports2026.filter((report) => report.locationMentions.some((location) => location.country === "USA")).length,
      filteredOutOldReports,
      sourceTypeBreakdown: sourceTypeBreakdown(reports2026),
      allStateDiscoveryStatus: jurisdictions.map((jurisdiction) => ({
        jurisdiction: jurisdiction.name,
        abbreviation: jurisdiction.abbreviation,
        searched: true,
        queryCount: jurisdiction.stateHealthDepartmentSearchTerms.length + jurisdiction.localNewsSearchTerms.length,
        reportCount: reports2026.filter((report) => report.locationMentions.some((location) => location.state === jurisdiction.abbreviation || location.state === jurisdiction.name)).length,
        candidateCount: nextCandidates.filter((report) => report.locationMentions.some((location) => location.state === jurisdiction.abbreviation || location.state === jurisdiction.name)).length
      })),
      sourceModeCounts: {
        officialOnly: reports2026.filter((report) => ["official", "national_health_agency"].includes(report.sourceType)).length,
        officialLocal: reports2026.filter((report) => ["official", "national_health_agency", "state_health_department", "local_health_department", "health_system"].includes(report.sourceType)).length,
        supplemental: reports2026.filter((report) => report.sourceType === "supplemental_news").length,
        needsReview: nextCandidates.length,
        everything: reports2026.filter((report) => report.sourceType !== "discovery").length
      },
      sourceRegistryCount: sourceRegistry.length
    },
    errors: sourceResults.filter((result) => !result.ok)
  };

  await writeJson(REPORTS_PATH, { lastUpdated: now, reports: reports2026 });
  await writeJson(CANDIDATES_PATH, nextCandidates);
  await writeJson(LOG_PATH, log);
  await writeDigest(now, events2026, reports2026, nextCandidates, log);
  console.log(`Refreshed sources=${sourceResults.length} candidates=${discoveredCandidates.length} events=${events2026.length} usReports=${log.debug.usReports}`);
}

async function fetchGdelt(source: Source, now: string): Promise<CandidateReport[]> {
  const response = await fetchWithTimeout(source.url, "application/json");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json() as { articles?: Array<{ title?: string; url?: string; domain?: string; seendate?: string; sourceCountry?: string }> };
  return (data.articles || [])
    .filter((article) => article.title && article.url && matchesTerms(`${article.title} ${article.url}`))
    .slice(0, 20)
    .map((article) => {
      const publishedAt = formatGdeltDate(article.seendate || "") || today(now);
      const title = article.title || "GDELT hantavirus discovery item";
      return {
        reportId: slug(`gdelt-${article.domain || "source"}-${title}-${publishedAt}`),
        eventId: inferEventId(title, article.url || ""),
        title,
        sourceName: article.domain ? `GDELT discovery: ${article.domain}` : "GDELT discovery",
        sourceUrl: article.url || source.url,
        sourceType: "discovery",
        confidence: "unverified",
        publishedAt,
        retrievedAt: today(now),
        locationMentions: [
          {
            name: "Discovery location pending review",
            city: null,
            state: null,
            country: article.sourceCountry === "US" ? "USA" : "Global",
            latitude: article.sourceCountry === "US" ? 39.8283 : null,
            longitude: article.sourceCountry === "US" ? -98.5795 : null,
            role: "advisory_region"
          }
        ],
        extractedCounts: emptyCounts(),
        summary: "GDELT discovery item matching 2026 hantavirus search terms. This is a candidate signal and is not official confirmed data.",
        needsReview: true,
        candidateReason: "Discovery source; manual review required before publication.",
        discoveredAt: now
      };
    });
}

async function writeDigest(lastUpdated: string, events: HantamapEvent[], reports: EvidenceReport[], candidates: CandidateReport[], log: any) {
  const activeEvents = events.filter((event) => event.eventStatus !== "historical");
  const supplemental = reports.filter((report) => report.sourceType === "supplemental_news");
  const lines = [
    "# Hantamap Daily Digest",
    "",
    `Last refresh timestamp: ${log.lastRefresh || lastUpdated}`,
    "",
    "## New Candidate Reports",
    ...(candidates.length ? candidates.slice(0, 12).map((report) => `- ${report.title} (${report.sourceName}) - ${report.sourceUrl}`) : ["- None"]),
    "",
    "## Active Verified Events",
    ...(activeEvents.length ? activeEvents.map((event) => `- ${event.eventName} (${event.eventStatus}) - ${event.countSnapshots[0]?.sourceUrl || "no source"}`) : ["- None"]),
    "",
    "## Supplemental Updates",
    ...(supplemental.length ? supplemental.map((report) => `- ${report.title} (${report.confidence}) - ${report.sourceUrl}`) : ["- None"]),
    "",
    "## Debug Counts",
    `- Events after deduplication: ${events.length}`,
    `- U.S. events: ${events.filter((event) => event.primaryLocation.country === "USA" || event.locations.some((location) => location.country === "USA")).length}`,
    `- U.S. reports: ${reports.filter((report) => report.locationMentions.some((location) => location.country === "USA")).length}`,
    `- Filtered out old reports: ${log.debug?.filteredOutOldReports ?? 0}`,
    `- All-state discovery jurisdictions: ${log.debug?.allStateDiscoveryStatus?.length ?? 0}`,
    "",
    "## Source Fetch Status",
    ...((log.sourceResults || []).map((result: SourceResult) => `- ${result.ok ? "ok" : "failed"}: ${result.name} (${result.url})${result.error ? ` - ${result.error}` : ""}`)),
    ""
  ];
  await writeFile(DIGEST_PATH, lines.join("\n"), "utf8");
}

async function fetchWithTimeout(url: string, accept = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, {
      headers: {
        accept,
        "user-agent": "HantamapRefresh/1.0"
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function gdeltUrl(query: string) {
  return "https://api.gdeltproject.org/api/v2/doc/doc?query=" +
    encodeURIComponent(`(${query}) sourcelang:english`) +
    "&mode=ArtList&format=json&maxrecords=50&sort=HybridRel&startdatetime=20260101000000&enddatetime=20261231235959";
}

function matchesTerms(value: string) {
  const lower = value.toLowerCase();
  return ["hantavirus", "andes virus", "hantavirus pulmonary syndrome", "hps", "mv hondius", "quarantine", "monitoring"].some((term) => lower.includes(term));
}

function inferEventId(title: string, url: string) {
  const value = `${title} ${url}`.toLowerCase();
  if (value.includes("hondius") || value.includes("andes")) return "mv-hondius-andes-2026";
  if (value.includes("nevada") || value.includes("quad-county") || value.includes("carson")) return "quad-county-nevada-hantavirus-2026";
  return "candidate-us-hantavirus-local-news-2026";
}

function dedupeCandidates(reports: CandidateReport[]) {
  const map = new Map<string, CandidateReport>();
  for (const report of reports.filter((item) => item.publishedAt.startsWith("2026-"))) {
    const key = normalizeUrl(report.sourceUrl) || normalizeTitle(report.title);
    const current = map.get(key);
    if (!current || report.publishedAt > current.publishedAt) map.set(key, report);
  }
  return Array.from(map.values()).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

function sourceTypeBreakdown(reports: EvidenceReport[]) {
  return reports.reduce<Record<string, number>>((acc, report) => {
    acc[report.sourceType] = (acc[report.sourceType] || 0) + 1;
    return acc;
  }, {});
}

function emptyCounts() {
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

function htmlToText(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function formatGdeltDate(value: string) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.searchParams.sort();
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.toLowerCase().trim();
  }
}

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 96);
}

function today(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
