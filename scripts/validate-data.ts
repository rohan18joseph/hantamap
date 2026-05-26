import fs from "node:fs";
import path from "node:path";

type AnyRecord = Record<string, any>;

const root = process.cwd();
const countKeys = [
  "confirmed",
  "presumptivePositive",
  "pendingConfirmation",
  "inconclusive",
  "suspected",
  "probable",
  "screened",
  "symptomatic",
  "asymptomatic",
  "negative",
  "deaths",
  "hospitalized",
  "critical",
  "quarantined",
  "monitored",
  "recovered",
  "clearedNegative",
  "totalReported"
];

const childLocationsThatShouldNotInheritDeaths = [
  "emory",
  "nebraska",
  "raleigh",
  "victoria",
  "vancouver-island",
  "yukon",
  "madrid",
  "paris",
  "tenerife",
  "eindhoven",
  "nijmegen",
  "argentina",
  "rotterdam"
];

const events = readJson<AnyRecord[]>("data/events.json");
const reportsFile = readJson<{ reports: AnyRecord[] }>("data/reports.json");
const candidates = readJson<AnyRecord[]>("data/candidate-reports.json");
const manual = readJson<{ sources?: AnyRecord[] }>("data/manual-source-overrides.json");
const allReports = [...reportsFile.reports, ...(manual.sources || [])];
const errors: string[] = [];

assertUnique(events.map((event) => event.eventId), "eventId");
assertUnique(allReports.map((report) => report.reportId), "reportId");

for (const event of events) {
  if (event.year !== 2026) errors.push(`${event.eventId} is outside 2026 scope`);
  assertUnique((event.locations || []).map((location: AnyRecord) => location.locationId), `locationId within ${event.eventId}`);
  for (const countsName of ["latestOfficialCounts", "latestSupplementalCounts"]) validateCountShape(event[countsName], `${event.eventId}.${countsName}`);
  for (const snapshot of event.countSnapshots || []) validateCountShape(snapshot.counts, `${event.eventId}.${snapshot.sourceName}.counts`);
  for (const location of event.locations || []) {
    validateLocation(event, location);
  }
}

for (const report of allReports) {
  if (!report.eventId) errors.push(`${report.reportId} is missing eventId`);
  if (!String(report.publishedAt || "").startsWith("2026-")) errors.push(`${report.reportId} is outside 2026 scope`);
  validateCountShape(report.extractedCounts, `${report.reportId}.extractedCounts`);
  for (const location of report.locationMentions || []) {
    if (location.counts) validateCountShape(location.counts, `${report.reportId}.${location.name}.counts`);
  }
}

for (const report of candidates) {
  if (!String(report.publishedAt || "").startsWith("2026-")) errors.push(`${report.reportId} candidate is outside 2026 scope`);
}

const markerIds = buildMarkerIds(events, allReports);
assertUnique(markerIds, "generated markerId");

const canadaVictoria = markerIds.find((id) => id.includes("victoria-bc"));
if (!canadaVictoria) errors.push("Canada/Victoria MV Hondius marker is missing");

const madridGomezUlla = markerCounts(events, allReports)
  .filter((marker) => marker.eventId === "mv-hondius-andes-2026" && marker.country === "Spain" && marker.id.includes("gomez-ulla"));
if (!madridGomezUlla.length) errors.push("Madrid/Gómez Ulla MV Hondius marker is missing");
if (madridGomezUlla.some((marker) => positive(marker.counts?.deaths))) errors.push("Madrid/Gómez Ulla marker has location-level deaths; expected zero/null");
if (!madridGomezUlla.some((marker) => positive(marker.counts?.confirmed))) errors.push("Madrid/Gómez Ulla marker is missing location-specific confirmed counts");

const usHondiusConfirmed = markerCounts(events, allReports)
  .filter((marker) => marker.eventId === "mv-hondius-andes-2026" && marker.country === "USA")
  .filter((marker) => positive(marker.counts?.confirmed));
if (usHondiusConfirmed.length) errors.push("MV Hondius U.S. locations contain confirmed counts; expected monitoring/screening only");

const canadaConfirmed = markerCounts(events, allReports)
  .filter((marker) => marker.eventId === "mv-hondius-andes-2026" && marker.country === "Canada")
  .filter((marker) => positive(marker.counts?.confirmed));
const hasOfficialCanadaConfirmation = allReports.some((report) =>
  report.eventId === "mv-hondius-andes-2026" &&
  report.sourceType === "national_health_agency" &&
  report.sourceName === "Public Health Agency of Canada" &&
  positive(report.extractedCounts?.confirmed)
);
if (canadaConfirmed.length && !hasOfficialCanadaConfirmation) {
  errors.push("Canada MV Hondius locations contain confirmed counts without national public-health confirmation");
}

if (errors.length) {
  console.error("Data validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Data validation passed.");
console.log(`Events: ${events.length}`);
console.log(`Evidence reports: ${allReports.length}`);
console.log(`Candidates: ${candidates.length}`);
console.log(`Generated markers: ${markerIds.length}`);
console.log(`Canada markers: ${markerCounts(events, allReports).filter((marker) => marker.country === "Canada").length}`);
console.log(`U.S. MV Hondius confirmed markers: ${usHondiusConfirmed.length}`);

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8")) as T;
}

function assertUnique(values: string[], label: string) {
  const seen = new Set<string>();
  for (const value of values.filter(Boolean)) {
    if (seen.has(value)) errors.push(`Duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

function validateCountShape(counts: AnyRecord | null | undefined, label: string) {
  if (!counts) {
    errors.push(`${label} missing count object`);
    return;
  }
  for (const key of countKeys) {
    if (!(key in counts)) errors.push(`${label} missing ${key}`);
  }
}

function validateLocation(event: AnyRecord, location: AnyRecord) {
  if (!location.locationId) errors.push(`${event.eventId} has location without locationId`);
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) errors.push(`${event.eventId}/${location.locationId} missing lat/lng`);
  const counts = location.counts || location.locationCounts;
  if (counts) validateCountShape(counts, `${event.eventId}.${location.locationId}.counts`);
  const slug = slugify(location.locationId || location.name || "");
  if (childLocationsThatShouldNotInheritDeaths.some((name) => slug.includes(name)) && positive(counts?.deaths)) {
    errors.push(`${event.eventId}/${location.locationId} has location-level deaths; expected deaths only where explicitly sourced`);
  }
  if ((location.sourceNames || []).includes("European Centre for Disease Prevention and Control") && !String(location.description || "").toLowerCase().includes("ecdc")) {
    errors.push(`${event.eventId}/${location.locationId} uses ECDC as a local source without local support`);
  }
}

function buildMarkerIds(eventList: AnyRecord[], reportList: AnyRecord[]) {
  const ids: string[] = [];
  for (const event of eventList) {
    ids.push(`${event.eventId}__primary__${event.primaryLocation.locationType}`);
    for (const location of event.locations || []) ids.push(`${event.eventId}__${location.locationId}__${location.locationType}`);
  }
  for (const report of reportList) {
    for (const [index, location] of (report.locationMentions || []).entries()) {
      const locationId = slugify(`${location.name}-${location.role}-${location.latitude ?? "na"}-${location.longitude ?? "na"}`);
      ids.push(`${report.eventId || "no-event"}__${locationId}__${report.reportId || index}`);
    }
  }
  return ids;
}

function markerCounts(eventList: AnyRecord[], reportList: AnyRecord[]) {
  const markers: Array<{ id: string; eventId: string; country: string; counts: AnyRecord | null }> = [];
  for (const event of eventList) {
    markers.push({ id: `${event.eventId}__primary`, eventId: event.eventId, country: event.primaryLocation.country, counts: event.latestOfficialCounts });
    for (const location of event.locations || []) markers.push({ id: `${event.eventId}__${slugify(location.locationId || location.name || "")}`, eventId: event.eventId, country: location.country, counts: location.counts || location.locationCounts || null });
  }
  for (const report of reportList) {
    for (const location of report.locationMentions || []) markers.push({ id: `${report.eventId || "no-event"}__${slugify(location.name || "")}__${report.reportId}`, eventId: report.eventId, country: location.country, counts: location.counts || null });
  }
  return markers;
}

function positive(value: unknown) {
  return typeof value === "number" && value > 0;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
