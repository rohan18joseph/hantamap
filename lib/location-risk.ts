import { distanceMiles } from "@/lib/geo";
import { reportMatchesSourceMode, type SourceFilterMode } from "@/lib/intelligence";
import { eventsToReports } from "@/lib/data";
import type { CaseCounts, HantamapEvent, HantamapReport, LocationRecord } from "@/lib/types";

export type LocationRiskResult = {
  label: "Low" | "Watch" | "Elevated" | "Active Advisory";
  score: number;
  events: Array<HantamapReport & { distance: number }>;
  counts: CaseCounts;
  confidence: "High" | "Medium" | "Low" | "Needs review";
  breakdown: Array<{ label: string; value: number; detail: string }>;
};

export function calculateLocationRisk(selectedLocation: LocationRecord, events: HantamapEvent[], sourceMode: SourceFilterMode): LocationRiskResult {
  const reports = eventsToReports(events).filter((report) => reportMatchesSourceMode(report, sourceMode));
  const nearby = reports
    .map((report) => ({ ...report, distance: nearestDistance(selectedLocation, report) }))
    .sort((a, b) => a.distance - b.distance);
  const weightedEvents = nearby.filter((report) => report.distance <= 250 || report.status === "active_advisory" || report.locationType === "travel_route");
  const counts = weightedEvents.reduce<CaseCounts>((acc, report) => mergeCounts(acc, report.caseCounts), emptyCounts());
  const peopleAffectedSignal = weightedEvents.reduce((sum, report) => {
    const count = (report.caseCounts.confirmed || 0) + (report.caseCounts.probable || 0) + (report.caseCounts.symptomatic || 0) + (report.caseCounts.hospitalized || 0) + (report.caseCounts.critical || 0);
    return sum + count * distanceWeight(report.distance);
  }, 0);
  const advisorySignal = weightedEvents.filter((report) => ["active_advisory", "confirmed_cluster", "monitoring"].includes(report.status) && ["official", "national_health_agency", "state_health_department", "local_health_department", "health_system"].includes(report.sourceType)).length;
  const transmissionSignal = weightedEvents.filter((report) => report.transmissionType === "person_to_person_possible").reduce((sum, report) => sum + distanceWeight(report.distance), 0);
  const severitySignal = weightedEvents.reduce((sum, report) => {
    const severity = (report.caseCounts.deaths || 0) * 2 + (report.caseCounts.critical || 0) + (report.caseCounts.hospitalized || 0);
    return sum + severity * distanceWeight(report.distance);
  }, 0);
  const monitoringSignal = weightedEvents.reduce((sum, report) => {
    const monitored = (report.caseCounts.monitored || 0) + (report.caseCounts.quarantined || 0);
    return sum + monitored * distanceWeight(report.distance) * 0.25;
  }, 0);
  const recencySignal = weightedEvents.filter((report) => daysAgo(report.reportDate) <= 30).length;
  const baselineSignal = selectedLocation.country === "USA" && selectedLocation.longitude < -95 ? 4 : ["Argentina", "Chile"].includes(selectedLocation.country) ? 4 : 1;
  const confidence = calculateEventConfidence(weightedEvents);

  const peopleScore = Math.min(30, peopleAffectedSignal * 3);
  const advisoryScore = Math.min(20, advisorySignal * 8);
  const transmissionScore = Math.min(15, transmissionSignal * 6);
  const severityScore = Math.min(15, severitySignal * 4);
  const monitoringScore = Math.min(10, monitoringSignal);
  const recencyScore = Math.min(5, recencySignal * 2);
  const baselineScore = Math.min(5, baselineSignal);
  const score = Math.round(peopleScore + advisoryScore + transmissionScore + severityScore + monitoringScore + recencyScore + baselineScore);

  return {
    label: score >= 65 ? "Active Advisory" : score >= 40 ? "Elevated" : score >= 20 ? "Watch" : "Low",
    score,
    events: weightedEvents,
    counts,
    confidence,
    breakdown: [
      { label: "People affected nearby", value: peopleScore, detail: "Confirmed, probable, symptomatic, hospitalized, and critical counts weighted by distance." },
      { label: "Official response/advisory", value: advisoryScore, detail: "CDC/WHO/ECDC/state/local public-health or health-system response near or linked to this location." },
      { label: "Transmission relevance", value: transmissionScore, detail: "Andes virus/person-to-person potential is weighted above rodentborne-only events." },
      { label: "Severity", value: severityScore, detail: "Deaths, critical illness, and hospitalization increase severity but are distance-weighted." },
      { label: "Monitoring/quarantine", value: monitoringScore, detail: "Monitored/quarantined people are response indicators, not confirmed infections." },
      { label: "Recency", value: recencyScore, detail: "Events updated within 30 days receive a small recency boost." },
      { label: "Regional baseline", value: baselineScore, detail: "Minor rodentborne regional context only." },
      { label: "Data confidence", value: confidence === "High" ? 5 : confidence === "Medium" ? 3 : 1, detail: "Report count affects confidence, not people-risk scoring." }
    ]
  };
}

export function calculateEventConfidence(reports: HantamapReport[]): LocationRiskResult["confidence"] {
  if (reports.some((report) => ["official", "national_health_agency", "state_health_department", "local_health_department"].includes(report.sourceType))) return "High";
  if (reports.some((report) => report.sourceType === "health_system") || reports.filter((report) => report.sourceType === "supplemental_news").length > 1) return "Medium";
  if (reports.some((report) => report.sourceType === "discovery")) return "Needs review";
  return reports.length ? "Low" : "Needs review";
}

function nearestDistance(location: LocationRecord, report: HantamapReport) {
  return Math.min(
    distanceMiles(location.latitude, location.longitude, report.latitude, report.longitude),
    ...report.relatedLocations.map((item) => distanceMiles(location.latitude, location.longitude, item.latitude, item.longitude))
  );
}

function distanceWeight(distance: number) {
  if (distance <= 25) return 1;
  if (distance <= 50) return 0.75;
  if (distance <= 100) return 0.45;
  if (distance <= 250) return 0.2;
  return 0.05;
}

function daysAgo(date: string) {
  return Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 86400000));
}

function mergeCounts(a: CaseCounts, b: CaseCounts): CaseCounts {
  return Object.fromEntries(Object.keys(a).map((key) => [key, Math.max(a[key as keyof CaseCounts] || 0, b[key as keyof CaseCounts] || 0) || null])) as CaseCounts;
}

function emptyCounts(): CaseCounts {
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
    monitored: null,
    quarantined: null,
    recovered: null,
    clearedNegative: null,
    totalReported: null
  };
}
