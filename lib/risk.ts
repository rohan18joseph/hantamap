import { distanceMiles } from "@/lib/geo";
import type { HantamapReport, LocationRecord } from "@/lib/types";

export type BriefStatus = "Low" | "Watch" | "Elevated" | "Active Advisory";

export type HantamapBrief = {
  status: BriefStatus;
  score: number;
  selectedLocation: LocationRecord;
  nearestActive?: HantamapReport & { distance: number };
  counts: Record<25 | 50 | 100 | 250, number>;
  groups: Record<25 | 50 | 100 | 250, Array<HantamapReport & { distance: number }>>;
  officialAdvisories: Array<HantamapReport & { distance: number }>;
  personToPersonEvents: Array<HantamapReport & { distance: number }>;
  deathAssociatedEvents: Array<HantamapReport & { distance: number }>;
  historicalBaseline: Array<HantamapReport & { distance: number }>;
  affectingReports: Array<HantamapReport & { distance: number }>;
  confidence: "High" | "Moderate" | "Limited";
  breakdown: Array<{ label: string; value: number; detail: string }>;
};

const radii = [25, 50, 100, 250] as const;

export function calculateBrief(location: LocationRecord, reports: HantamapReport[], lastUpdated: string): HantamapBrief {
  const now = new Date(lastUpdated);
  const enriched = reports.map((report) => ({
    ...report,
    distance: nearestReportDistance(location, report)
  }));
  const within250 = enriched.filter((report) => report.distance <= 250);
  const recent = within250.filter((report) => daysBetween(report.reportDate, now) <= 180 && report.status !== "historical");
  const active = within250.filter((report) =>
    ["confirmed_cluster", "confirmed_case", "active_advisory", "monitoring", "probable"].includes(report.status)
  );
  const officialAdvisories = within250.filter((report) => ["official", "national_health_agency"].includes(report.sourceType) && report.status === "active_advisory");
  const personToPersonEvents = within250.filter((report) => report.transmissionType === "person_to_person_possible");
  const deathAssociatedEvents = within250.filter((report) => (report.caseCounts.deaths || 0) > 0);
  const monitoringEvents = within250.filter((report) => (report.caseCounts.monitored || 0) > 0 || (report.caseCounts.quarantined || 0) > 0);
  const historicalBaseline = within250.filter((report) => report.status === "historical");
  const nearestActive = active.sort((a, b) => a.distance - b.distance)[0];

  const counts = Object.fromEntries(
    radii.map((radius) => [radius, recent.filter((report) => report.distance <= radius).length])
  ) as Record<25 | 50 | 100 | 250, number>;

  const groups = {
    25: enriched.filter((report) => report.distance <= 25),
    50: enriched.filter((report) => report.distance > 25 && report.distance <= 50),
    100: enriched.filter((report) => report.distance > 50 && report.distance <= 100),
    250: enriched.filter((report) => report.distance > 100 && report.distance <= 250)
  };

  const peopleAffectedScore = Math.min(30, recent.reduce((sum, report) => {
    const people = (report.caseCounts.confirmed || 0) + (report.caseCounts.probable || 0) + (report.caseCounts.symptomatic || 0) + (report.caseCounts.hospitalized || 0) + (report.caseCounts.critical || 0) + (report.caseCounts.presumptivePositive || 0) * 0.7 + (report.caseCounts.pendingConfirmation || 0) * 0.35 + (report.caseCounts.inconclusive || 0) * 0.2;
    return sum + people * (report.distance <= 25 ? 1 : report.distance <= 50 ? 0.75 : report.distance <= 100 ? 0.45 : 0.2);
  }, 0));
  const distanceScore = nearestActive ? Math.min(30, peopleAffectedScore + Math.max(0, 8 - nearestActive.distance / 35)) : 0;
  const advisoryScore = Math.min(20, officialAdvisories.length * 16);
  const andesScore = Math.min(15, personToPersonEvents.some((report) => report.distance <= 250) ? 12 : 0);
  const deathScore = Math.min(15, deathAssociatedEvents.reduce((sum, report) => sum + (report.caseCounts.deaths || 0) * (report.distance <= 25 ? 3 : report.distance <= 50 ? 2 : report.distance <= 100 ? 1.2 : 0.5), 0));
  const monitoringScore = Math.min(10, monitoringEvents.reduce((sum, report) => sum + ((report.caseCounts.monitored || 0) + (report.caseCounts.quarantined || 0)) * (report.distance <= 50 ? 0.22 : report.distance <= 100 ? 0.12 : 0.06), 0));
  const screeningScore = Math.min(5, recent.reduce((sum, report) => sum + ((report.caseCounts.screened || 0) * 0.2 + (report.caseCounts.negative || 0) * 0.05), 0));
  const recencyScore = Math.min(5, recent.filter((report) => daysBetween(report.reportDate, now) <= 30).length ? 5 : 0);
  const baselineScore = minorBaseline(location, historicalBaseline.length);
  const confidenceScore = Math.min(5, within250.filter((report) => report.confidence === "high").length * 1.5);

  const score = Math.round(
    Math.max(0, Math.min(100, distanceScore + advisoryScore + andesScore + deathScore + monitoringScore + screeningScore + recencyScore + baselineScore + confidenceScore))
  );

  const status: BriefStatus =
    officialAdvisories.length && score >= 34 ? "Active Advisory" : score >= 56 ? "Elevated" : score >= 26 ? "Watch" : "Low";

  const confidence = within250.filter((report) => report.confidence === "high").length >= 2
    ? "High"
    : within250.length
      ? "Moderate"
      : "Limited";

  return {
    status,
    score,
    selectedLocation: location,
    nearestActive,
    counts,
    groups,
    officialAdvisories,
    personToPersonEvents,
    deathAssociatedEvents,
    historicalBaseline,
    affectingReports: within250,
    confidence,
    breakdown: [
      {
        label: "Proximity to people affected",
        value: distanceScore,
        detail: nearestActive ? `${Math.round(nearestActive.distance)} miles to nearest active cluster. People affected, not article count, drives this factor.` : "No active cluster within 250 miles"
      },
      {
        label: "Nearby official advisories",
        value: advisoryScore,
        detail: officialAdvisories.length ? `${officialAdvisories.length} official advisory signal(s)` : "No nearby official advisory"
      },
      {
        label: "Andes virus/person-to-person relevance",
        value: andesScore,
        detail: personToPersonEvents.length ? `${personToPersonEvents.length} relevant event(s)` : "No nearby person-to-person relevant event"
      },
      {
        label: "People affected nearby",
        value: peopleAffectedScore,
        detail: "Confirmed, probable, presumptive, symptomatic, hospitalized, and critical people are weighted by distance. Reports are evidence, not case counts."
      },
      {
        label: "Monitoring/quarantine response",
        value: monitoringScore,
        detail: monitoringEvents.length ? `${monitoringEvents.length} event cluster(s) include monitored/quarantined people. This does not mean confirmed infection.` : "No nearby monitoring/quarantine signal"
      },
      {
        label: "Severity",
        value: deathScore,
        detail: deathAssociatedEvents.length ? "Deaths, critical illness, and hospitalization matter, but do not imply local risk when the affected location is distant." : "No nearby death-associated event within 250 miles"
      },
      {
        label: "Screening/testing signal",
        value: screeningScore,
        detail: "Screening, pending confirmation, and negative tests are lower-weight signals. Screening does not mean confirmed infection."
      },
      {
        label: "Recency",
        value: recencyScore,
        detail: recencyScore ? "At least one relevant source-backed cluster was updated in the last 30 days." : "No nearby cluster updated in the last 30 days."
      },
      {
        label: "Rodent/environment baseline",
        value: baselineScore,
        detail: "Minor baseline context only; not a personal exposure estimate"
      },
      {
        label: "Source confidence and freshness",
        value: confidenceScore,
        detail: confidence === "High" ? "Multiple high-confidence sources nearby" : "Limited nearby high-confidence source depth"
      }
    ]
  };
}

function nearestReportDistance(location: LocationRecord, report: HantamapReport) {
  const points = [
    { latitude: report.latitude, longitude: report.longitude },
    ...report.relatedLocations.map((item) => ({ latitude: item.latitude, longitude: item.longitude }))
  ];
  return Math.min(...points.map((point) => distanceMiles(location.latitude, location.longitude, point.latitude, point.longitude)));
}

function daysBetween(date: string, now: Date) {
  return Math.max(0, Math.round((now.getTime() - new Date(date).getTime()) / 86400000));
}

function minorBaseline(location: LocationRecord, historicalCount: number) {
  const westernUS = location.country === "United States" && location.longitude < -95;
  const southernCone = ["Argentina", "Chile"].includes(location.country);
  return Math.min(6, 2 + (westernUS ? 2 : 0) + (southernCone ? 2 : 0) + Math.min(2, historicalCount));
}
