import candidatesJson from "@/data/candidate-reports.json";
import eventsJson from "@/data/events.json";
import manualSourceOverridesJson from "@/data/manual-source-overrides.json";
import reportsJson from "@/data/reports.json";
import { distanceMiles } from "@/lib/geo";
import { reportMatchesSourceMode, type SourceFilterMode } from "@/lib/intelligence";
import type {
  CandidateReport,
  CaseCounts,
  CountSource,
  EvidenceReport,
  EvidenceSummary,
  EventCategory,
  HantamapEvent,
  HantamapReport,
  LocationMention,
  LocationRecord,
  LocationType,
  ReportFile,
  SourceType
} from "@/lib/types";

export type RenderableOptions = {
  sourceMode?: SourceFilterMode;
  selectedMapTab?: string;
  includeCandidates?: boolean;
  year?: 2026;
  selectedLocation?: LocationRecord;
};

type ClusterDraft = {
  key: string;
  eventId: string;
  title: string;
  categories: Set<EventCategory>;
  sourceTypes: Set<SourceType>;
  confidenceRank: number;
  corroborationStatus: HantamapReport["corroborationStatus"];
  locationName: string;
  country: string;
  latitude: number;
  longitude: number;
  locationType: LocationType;
  locationPrecision: HantamapReport["locationPrecision"];
  reportDate: string;
  summary: string;
  counts: CaseCounts;
  countSources: CountSource[];
  eventWideCountSources: CountSource[];
  evidenceReports: EvidenceSummary[];
  relatedLocations: HantamapReport["relatedLocations"];
};

export function getRenderableEvents(options: RenderableOptions = {}): HantamapReport[] {
  const sourceMode = options.sourceMode || "official_local";
  const includeCandidates = options.includeCandidates || sourceMode === "needs_review" || sourceMode === "everything";
  const events = (eventsJson as HantamapEvent[]).filter((event) => event.year === (options.year || 2026));
  const reports = withManualOverrides(((reportsJson as ReportFile).reports as EvidenceReport[])).filter((report) => report.publishedAt.startsWith("2026-"));
  const candidates = includeCandidates ? (candidatesJson as CandidateReport[]).filter((report) => report.publishedAt.startsWith("2026-")) : [];
  const clusters = buildEventClustersFromReports(events, reports, candidates)
    .filter((cluster) => reportMatchesSourceMode(cluster, sourceMode) || cluster.sourceModeEligibility?.includes(sourceMode))
    .filter((cluster) => tabAllows(cluster, options.selectedMapTab || "all"));

  if (!options.selectedLocation) return clusters;
  return clusters
    .map((cluster) => ({
      ...cluster,
      _distance: Math.min(
        distanceMiles(options.selectedLocation!.latitude, options.selectedLocation!.longitude, cluster.latitude, cluster.longitude),
        ...cluster.relatedLocations.map((loc) => distanceMiles(options.selectedLocation!.latitude, options.selectedLocation!.longitude, loc.latitude, loc.longitude))
      )
    }))
    .sort((a, b) => a._distance - b._distance)
    .map(({ _distance, ...cluster }) => cluster);
}

export function buildEventClustersFromReports(events: HantamapEvent[], reports: EvidenceReport[], candidates: CandidateReport[]): HantamapReport[] {
  const drafts = new Map<string, ClusterDraft>();
  const eventById = new Map(events.map((event) => [event.eventId, event]));

  for (const event of events) {
    for (const [index, location] of [event.primaryLocation, ...event.locations].entries()) {
      const eventLocation = location as Partial<{ description: string; sourceUrls: string[]; counts: CaseCounts; locationCounts: CaseCounts; countSources: CountSource[] }>;
      const description = eventLocation.description || event.summary;
      const sourceUrls = eventLocation.sourceUrls || [];
      const countsForLocation = index === 0 ? event.latestOfficialCounts : eventLocation.counts || eventLocation.locationCounts;
      const key = clusterKey(event.eventId, location.name, location.latitude, location.longitude, location.locationType);
      const draft = ensureDraft(drafts, key, {
        eventId: event.eventId,
        title: event.eventName,
        locationName: location.name,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
        locationType: location.locationType,
        locationPrecision: location.city ? "city" : location.state ? "state" : "country",
        reportDate: event.lastUpdated,
        summary: description || event.summary,
        corroborationStatus: event.corroborationStatus
      });
      addCategories(draft, categoriesFromEvent(event, location.locationType, countsForLocation, index === 0));
      if (countsForLocation) mergeCountsInto(draft.counts, countsForLocation);
      if (index === 0) mergeSources(draft, event.countSnapshots);
      draft.eventWideCountSources.push(...event.countSnapshots);
      if (eventLocation.countSources?.length) mergeSources(draft, eventLocation.countSources);
      draft.relatedLocations.push({
        type: location.locationType,
        name: location.name,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
        date: event.lastUpdated,
        description,
        sourceUrl: sourceUrls[0] || event.countSnapshots[0]?.sourceUrl || "#"
      });
    }
  }

  for (const report of [...reports, ...candidates]) {
    const event = eventById.get(report.eventId);
    const mentions = report.locationMentions.filter((location) => location.latitude !== null && location.longitude !== null);
    const fallback = event?.primaryLocation;
    const locations = mentions.length ? mentions : fallback ? [{
      name: fallback.name,
      city: fallback.city,
      state: fallback.state,
      country: fallback.country,
      latitude: fallback.latitude,
      longitude: fallback.longitude,
      role: fallback.locationType
    } satisfies LocationMention] : [];

    for (const location of locations) {
      const latitude = location.latitude ?? fallback?.latitude;
      const longitude = location.longitude ?? fallback?.longitude;
      if (latitude === undefined || longitude === undefined) continue;
      const eventId = report.eventId || inferEventId(report);
      const explicitLocationCounts = getLocationMentionCounts(location);
      const useReportWideCounts = locations.length === 1 || Boolean(explicitLocationCounts);
      const countsForLocation = explicitLocationCounts || (useReportWideCounts ? report.extractedCounts : undefined);
      const key = clusterKey(eventId, location.name, latitude, longitude, location.role);
      const draft = ensureDraft(drafts, key, {
        eventId,
        title: event?.eventName || report.title,
        locationName: location.name,
        country: location.country,
        latitude,
        longitude,
        locationType: location.role,
        locationPrecision: location.city ? "city" : location.state ? "state" : location.country ? "country" : "unknown",
        reportDate: report.publishedAt,
        summary: report.summary,
        corroborationStatus: report.needsReview ? "needs_review" : event?.corroborationStatus || "single_source"
      });
      addCategories(draft, categoriesFromReport(report, location.role, countsForLocation, useReportWideCounts));
      if (event?.countSnapshots.length) draft.eventWideCountSources.push(...event.countSnapshots);
      if (countsForLocation) {
        mergeCountsInto(draft.counts, countsForLocation);
        mergeSources(draft, [evidenceToCountSource(report, countsForLocation)]);
      }
      draft.evidenceReports.push(evidenceSummary(report));
      draft.sourceTypes.add(report.sourceType);
      draft.confidenceRank = Math.max(draft.confidenceRank, confidenceRank(report.confidence));
      if (report.publishedAt > draft.reportDate) draft.reportDate = report.publishedAt;
      draft.relatedLocations.push({
        type: location.role,
        name: location.name,
        country: location.country,
        latitude,
        longitude,
        date: report.publishedAt,
        description: `${location.role.replaceAll("_", " ")} mentioned by ${report.sourceName}.`,
        sourceUrl: report.sourceUrl
      });
    }
  }

  return Array.from(drafts.values()).map(draftToReport);
}

export function explainReportMapInclusion(query: string, sourceMode: SourceFilterMode = "everything", selectedMapTab = "all") {
  const reports = [...withManualOverrides((reportsJson as ReportFile).reports as EvidenceReport[]), ...(candidatesJson as CandidateReport[])];
  const report = reports.find((item) =>
    item.reportId.toLowerCase().includes(query.toLowerCase()) ||
    item.title.toLowerCase().includes(query.toLowerCase())
  );
  if (!report) return { found: false, query };
  const clusters = getRenderableEvents({ sourceMode, selectedMapTab, includeCandidates: true });
  const included = clusters.filter((cluster) => cluster.evidenceReports?.some((evidence) => evidence.reportId === report.reportId));
  return {
    found: true,
    query,
    reportId: report.reportId,
    title: report.title,
    foundInCandidates: (candidatesJson as CandidateReport[]).some((item) => item.reportId === report.reportId),
    foundInReports: ((reportsJson as ReportFile).reports as EvidenceReport[]).some((item) => item.reportId === report.reportId),
    hasEventId: Boolean(report.eventId),
    hasLocation: report.locationMentions.length > 0,
    hasLatLng: report.locationMentions.some((location) => location.latitude !== null && location.longitude !== null),
    categories: categoriesFromReport(report, report.locationMentions[0]?.role || "advisory_region", getLocationMentionCounts(report.locationMentions[0]), true),
    sourceMode,
    selectedMapTab,
    includedInRenderableEvents: included.length > 0,
    includedClusters: included.map((cluster) => ({ id: cluster.id, title: cluster.title, categories: cluster.categories, location: cluster.locationName })),
    reasonExcluded: included.length ? "" : exclusionReason(report, sourceMode, selectedMapTab)
  };
}

function ensureDraft(drafts: Map<string, ClusterDraft>, key: string, seed: Omit<ClusterDraft, "key" | "categories" | "sourceTypes" | "confidenceRank" | "counts" | "countSources" | "eventWideCountSources" | "evidenceReports" | "relatedLocations">) {
  const existing = drafts.get(key);
  if (existing) return existing;
  const draft: ClusterDraft = {
    key,
    categories: new Set(),
    sourceTypes: new Set(),
    confidenceRank: 0,
    counts: emptyCounts(),
    countSources: [],
    eventWideCountSources: [],
    evidenceReports: [],
    relatedLocations: [],
    ...seed
  };
  drafts.set(key, draft);
  return draft;
}

function draftToReport(draft: ClusterDraft): HantamapReport {
  const sourceType = bestSourceType(draft.sourceTypes);
  const confidence = draft.confidenceRank >= 4 ? "high" : draft.confidenceRank >= 3 ? "medium" : draft.confidenceRank >= 2 ? "low" : "unverified";
  return {
    id: draft.key,
    eventId: draft.eventId,
    title: draft.title,
    disease: "Hantavirus",
    virusType: draft.title.toLowerCase().includes("andes") || draft.categories.has("travel_linked_report") ? "Andes virus" : "Hantavirus",
    transmissionType: draft.title.toLowerCase().includes("andes") || draft.eventId.includes("hondius") ? "person_to_person_possible" : "rodentborne",
    status: statusFromCategories(draft.categories),
    country: draft.country,
    locationName: draft.locationName,
    latitude: draft.latitude,
    longitude: draft.longitude,
    locationType: draft.locationType,
    caseCount: draft.counts.totalReported,
    confirmedCount: draft.counts.confirmed,
    deathCount: draft.counts.deaths,
    sourceName: draft.countSources[0]?.sourceName || "Hantamap evidence cluster",
    sourceUrl: draft.countSources[0]?.sourceUrl || "#",
    sourceType,
    confidence,
    corroborationStatus: draft.corroborationStatus,
    reportDate: draft.reportDate,
    lastVerified: draft.reportDate,
    summary: draft.summary,
    caseCounts: draft.counts,
    countSources: uniqueSources(draft.countSources),
    eventWideCountSources: uniqueSources(draft.eventWideCountSources),
    relatedLocations: uniqueRelated(draft.relatedLocations),
    categories: Array.from(draft.categories),
    sourceModeEligibility: eligibility(Array.from(draft.sourceTypes), draft.corroborationStatus),
    locationPrecision: draft.locationPrecision,
    evidenceReports: uniqueEvidence(draft.evidenceReports),
    renderReason: "Renderable cluster created from canonical event locations plus report/candidate location mentions."
  };
}

function categoriesFromEvent(event: HantamapEvent, role: LocationType, counts?: CaseCounts, isPrimaryEventLocation = false): EventCategory[] {
  const categories: EventCategory[] = [];
  if (event.eventStatus === "confirmed" && isPrimaryEventLocation) categories.push("confirmed_cluster");
  if ((counts?.confirmed || 0) > 0) categories.push("confirmed_case");
  if ((counts?.presumptivePositive || 0) > 0 || (counts?.pendingConfirmation || 0) > 0) categories.push("suspected_case");
  if ((counts?.suspected || 0) > 0) categories.push("suspected_case");
  if ((counts?.probable || 0) > 0) categories.push("probable_case");
  if (event.eventStatus === "suspected") categories.push("suspected_case");
  if (event.eventStatus === "probable") categories.push("probable_case");
  if (event.eventStatus === "active_advisory") categories.push("advisory");
  if (role === "monitoring_location" || (counts?.monitored || 0) > 0) categories.push("monitoring");
  if (role === "quarantine_location" || (counts?.quarantined || 0) > 0) categories.push("quarantine");
  if (role === "hospital_location" || role === "treatment_location") categories.push("hospital_evaluation");
  if ((counts?.screened || 0) > 0 || (counts?.negative || 0) > 0 || (counts?.inconclusive || 0) > 0 || (counts?.pendingConfirmation || 0) > 0) categories.push("screening");
  if ((counts?.negative || 0) > 0 || (counts?.clearedNegative || 0) > 0) categories.push("negative_screening");
  if ((counts?.symptomatic || 0) > 0 || (counts?.asymptomatic || 0) > 0 || (counts?.presumptivePositive || 0) > 0) categories.push("symptomatic_screening");
  if (["travel_route", "ship_cleaning_route", "repatriation_location", "evacuation_location"].includes(role)) categories.push("travel_linked_report");
  if (role === "exposure_location" || role === "investigation_location") categories.push("exposure_location");
  if ((counts?.deaths || 0) > 0) categories.push("death");
  return categories.length ? categories : ["supplemental_report"];
}

function categoriesFromReport(report: EvidenceReport, role: LocationType, counts?: CaseCounts, useReportWideText = true): EventCategory[] {
  const text = `${report.title} ${report.summary}`.toLowerCase();
  const categories = new Set<EventCategory>();
  const sourceCounts = counts || (useReportWideText ? report.extractedCounts : emptyCounts());
  if ((sourceCounts.confirmed || 0) > 0 || (useReportWideText && /confirmed/.test(text) && !/not confirmed|no .*confirmed/.test(text))) categories.add("confirmed_case");
  if ((sourceCounts.presumptivePositive || 0) > 0) categories.add("suspected_case");
  if ((sourceCounts.pendingConfirmation || 0) > 0 || (sourceCounts.inconclusive || 0) > 0) categories.add("screening");
  if ((sourceCounts.suspected || 0) > 0 || (useReportWideText && /suspected|presumptive positive|presumed positive/.test(text))) categories.add("suspected_case");
  if ((sourceCounts.probable || 0) > 0 || (useReportWideText && /probable/.test(text))) categories.add("probable_case");
  if ((useReportWideText && /screen|assess|tested|testing|pending confirmation|inconclusive/.test(text)) || (sourceCounts.screened || 0) > 0) categories.add("screening");
  if ((useReportWideText && /negative/.test(text)) || (sourceCounts.negative || 0) > 0 || (sourceCounts.clearedNegative || 0) > 0) categories.add("negative_screening");
  if ((sourceCounts.symptomatic || 0) > 0) categories.add("symptomatic_screening");
  if ((sourceCounts.monitored || 0) > 0 || (useReportWideText && /monitor/.test(text))) categories.add("monitoring");
  if ((sourceCounts.quarantined || 0) > 0 || (useReportWideText && /quarantine/.test(text))) categories.add("quarantine");
  if (role === "hospital_location" || role === "treatment_location" || (useReportWideText && /hospital|evaluation|care/.test(text))) categories.add("hospital_evaluation");
  if ((sourceCounts.deaths || 0) > 0 || (useReportWideText && /death|died|fatal/.test(text))) categories.add("death");
  if (/advisory|guidance|health department|cdc|ecdc|rivm|who/.test(text)) categories.add("advisory");
  if (["travel_route", "evacuation_location", "repatriation_location", "ship_cleaning_route"].includes(role) || /hondius|cruise|passenger|travel/.test(text)) categories.add("travel_linked_report");
  if (report.sourceType === "supplemental_news") categories.add("supplemental_report");
  if (report.needsReview || report.sourceType === "discovery") categories.add("needs_review");
  return Array.from(categories);
}

function tabAllows(report: HantamapReport, tab: string) {
  const categories = new Set(report.categories || []);
  switch (tab) {
    case "confirmed":
      return categories.has("confirmed_case") || categories.has("confirmed_cluster");
    case "suspected":
      return categories.has("suspected_case") || categories.has("probable_case") || categories.has("symptomatic_screening") || (report.caseCounts.presumptivePositive || 0) > 0 || (report.caseCounts.pendingConfirmation || 0) > 0;
    case "screenings":
    case "screening":
      return categories.has("screening") || categories.has("negative_screening") || categories.has("symptomatic_screening") || categories.has("hospital_evaluation") || (report.caseCounts.inconclusive || 0) > 0;
    case "monitoring":
      return categories.has("monitoring") || categories.has("quarantine");
    case "deaths":
      return categories.has("death") || (report.caseCounts.deaths || 0) > 0;
    case "advisories":
      return categories.has("advisory");
    case "travel":
      return categories.has("travel_linked_report") || categories.has("exposure_location");
    case "needs_review":
      return categories.has("needs_review") || report.sourceType === "discovery";
    default:
      return true;
  }
}

function statusFromCategories(categories: Set<EventCategory>): HantamapReport["status"] {
  if (categories.has("confirmed_cluster") || categories.has("confirmed_case")) return "confirmed_cluster";
  if (categories.has("probable_case")) return "probable";
  if (categories.has("suspected_case")) return "suspected";
  if (categories.has("advisory")) return "active_advisory";
  if (categories.has("monitoring") || categories.has("quarantine") || categories.has("screening")) return "monitoring";
  return "supplemental_update";
}

function eligibility(sourceTypes: SourceType[], corroboration: string) {
  const modes = new Set<string>();
  if (sourceTypes.some((type) => ["official", "national_health_agency"].includes(type))) modes.add("official");
  if (sourceTypes.some((type) => ["official", "national_health_agency", "state_health_department", "local_health_department", "health_system"].includes(type))) modes.add("official_local");
  if (sourceTypes.some((type) => ["supplemental_news", "moderated"].includes(type))) modes.add("supplemental");
  if (sourceTypes.some((type) => type === "discovery") || corroboration === "needs_review") modes.add("needs_review");
  modes.add("everything");
  return Array.from(modes);
}

function clusterKey(eventId: string, name: string, latitude: number, longitude: number, role: string) {
  return `${eventId}-${slug(name)}-${role}-${latitude.toFixed(2)}-${longitude.toFixed(2)}`;
}

function inferEventId(report: EvidenceReport) {
  return report.eventId || slug(report.title).slice(0, 60);
}

function mergeCountsInto(target: CaseCounts, source: CaseCounts) {
  for (const key of Object.keys(target) as Array<keyof CaseCounts>) {
    const value = source[key];
    if (value === null || value === undefined) continue;
    target[key] = Math.max(target[key] || 0, value);
  }
}

function addCategories(draft: ClusterDraft, categories: EventCategory[]) {
  for (const category of categories) draft.categories.add(category);
}

function mergeSources(draft: ClusterDraft, sources: CountSource[]) {
  for (const source of sources) {
    draft.countSources.push(source);
    if (isSourceType(source.sourceType)) draft.sourceTypes.add(source.sourceType);
    draft.confidenceRank = Math.max(draft.confidenceRank, confidenceRank(String(source.confidence)));
  }
}

function evidenceToCountSource(report: EvidenceReport, counts: CaseCounts = report.extractedCounts): CountSource {
  return {
    sourceName: report.sourceName,
    sourceUrl: report.sourceUrl,
    sourceType: report.sourceType,
    confidence: report.confidence,
    reportedAt: report.publishedAt,
    counts,
    notes: report.summary
  };
}

function evidenceSummary(report: EvidenceReport): EvidenceSummary {
  return {
    reportId: report.reportId,
    title: report.title,
    sourceName: report.sourceName,
    sourceUrl: report.sourceUrl,
    sourceType: report.sourceType,
    confidence: report.confidence,
    publishedAt: report.publishedAt,
    summary: report.summary
  };
}

function bestSourceType(sourceTypes: Set<SourceType>): SourceType {
  const order: SourceType[] = ["official", "national_health_agency", "state_health_department", "local_health_department", "health_system", "moderated", "supplemental_news", "discovery"];
  return order.find((type) => sourceTypes.has(type)) || "discovery";
}

function confidenceRank(confidence: string) {
  if (confidence === "high") return 4;
  if (confidence === "medium") return 3;
  if (confidence === "low") return 2;
  return 1;
}

function isSourceType(value: string): value is SourceType {
  return ["official", "national_health_agency", "state_health_department", "local_health_department", "health_system", "moderated", "supplemental_news", "discovery"].includes(value);
}

function uniqueSources(sources: CountSource[]) {
  return Array.from(new Map(sources.map((source) => [`${source.sourceUrl}-${source.reportedAt}`, source])).values());
}

function uniqueEvidence(evidence: EvidenceSummary[]) {
  return Array.from(new Map(evidence.map((item) => [item.reportId, item])).values());
}

function uniqueRelated(related: HantamapReport["relatedLocations"]) {
  return Array.from(new Map(related.map((item) => [`${item.name}-${item.latitude}-${item.longitude}-${item.sourceUrl}`, item])).values());
}

function exclusionReason(report: EvidenceReport, mode: SourceFilterMode, tab: string) {
  if (!report.publishedAt.startsWith("2026-")) return "Report is outside 2026 scope.";
  if (!report.locationMentions.length) return "Report has no location mentions.";
  if (!report.locationMentions.some((location) => location.latitude !== null && location.longitude !== null)) return "Report has no renderable latitude/longitude.";
  const categories = categoriesFromReport(report, report.locationMentions[0].role, getLocationMentionCounts(report.locationMentions[0]), true);
  if (!tabAllows({ categories, caseCounts: report.extractedCounts, sourceType: report.sourceType } as HantamapReport, tab)) return `Report categories do not match tab "${tab}".`;
  return `Report source type "${report.sourceType}" is not eligible for source mode "${mode}".`;
}

function withManualOverrides(reports: EvidenceReport[]) {
  const manualReports = ((manualSourceOverridesJson as unknown as { sources?: EvidenceReport[] }).sources || []).map((report) => ({ ...report, needsReview: report.needsReview ?? false }));
  const byId = new Map(reports.map((report) => [report.reportId, report]));
  for (const report of manualReports) byId.set(report.reportId, report);
  return Array.from(byId.values());
}

function getLocationMentionCounts(location?: LocationMention): CaseCounts | undefined {
  const counts = (location as (LocationMention & { counts?: CaseCounts | null }) | undefined)?.counts;
  return counts || undefined;
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
    quarantined: null,
    monitored: null,
    recovered: null,
    clearedNegative: null,
    totalReported: null
  };
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}
