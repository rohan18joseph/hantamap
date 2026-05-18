export type Confidence = "high" | "medium" | "low" | "unverified";

export type SourceType =
  | "official"
  | "national_health_agency"
  | "state_health_department"
  | "local_health_department"
  | "health_system"
  | "moderated"
  | "supplemental_news"
  | "discovery";

export type CorroborationStatus =
  | "official_confirmed"
  | "corroborated"
  | "single_source"
  | "conflicting"
  | "needs_review";

export type ReportStatus =
  | "confirmed_cluster"
  | "confirmed_case"
  | "active_advisory"
  | "monitoring"
  | "historical"
  | "supplemental_update"
  | "suspected"
  | "probable";

export type TransmissionType = "rodentborne" | "person_to_person_possible" | "unknown";

export type LocationType =
  | "exposure_location"
  | "case_residence"
  | "residence"
  | "case_detection"
  | "evacuation_location"
  | "hospital_location"
  | "treatment_location"
  | "quarantine_location"
  | "monitoring_location"
  | "screening_location"
  | "origin_location"
  | "repatriation_location"
  | "investigation_location"
  | "ship_cleaning_route"
  | "travel_route"
  | "advisory_region";

export type EventStatus = "confirmed" | "suspected" | "probable" | "monitoring" | "active_advisory" | "supplemental" | "needs_review" | "historical";

export type RelatedLocation = {
  type: LocationType;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  date: string;
  description: string;
  sourceUrl: string;
};

export type HantamapReport = {
  id: string;
  eventId: string;
  title: string;
  disease: "Hantavirus";
  virusType: "Andes virus" | "Sin Nombre virus" | "Hantavirus" | "Unknown";
  transmissionType: TransmissionType;
  status: ReportStatus;
  country: string;
  locationName: string;
  latitude: number;
  longitude: number;
  locationType: LocationType;
  caseCount: number | null;
  confirmedCount: number | null;
  deathCount: number | null;
  sourceName: string;
  sourceUrl: string;
  sourceType: SourceType;
  confidence: Confidence;
  corroborationStatus: CorroborationStatus;
  reportDate: string;
  lastVerified: string;
  summary: string;
  caseCounts: CaseCounts;
  countSources: CountSource[];
  eventWideCountSources?: CountSource[];
  relatedLocations: RelatedLocation[];
  categories?: EventCategory[];
  sourceModeEligibility?: string[];
  locationPrecision?: "exact" | "city" | "county" | "state" | "country" | "unknown";
  evidenceReports?: EvidenceSummary[];
  renderReason?: string;
};

export type CaseCounts = {
  confirmed: number | null;
  presumptivePositive: number | null;
  pendingConfirmation: number | null;
  inconclusive: number | null;
  suspected: number | null;
  probable: number | null;
  screened: number | null;
  symptomatic: number | null;
  asymptomatic: number | null;
  negative: number | null;
  deaths: number | null;
  hospitalized: number | null;
  critical: number | null;
  quarantined: number | null;
  monitored: number | null;
  recovered: number | null;
  clearedNegative: number | null;
  totalReported: number | null;
};

export type EventCategory =
  | "confirmed_case"
  | "confirmed_cluster"
  | "suspected_case"
  | "probable_case"
  | "screening"
  | "negative_screening"
  | "symptomatic_screening"
  | "monitoring"
  | "quarantine"
  | "hospital_evaluation"
  | "death"
  | "advisory"
  | "exposure_location"
  | "travel_linked_report"
  | "supplemental_report"
  | "needs_review";

export type EvidenceSummary = {
  reportId: string;
  title: string;
  sourceName: string;
  sourceUrl: string;
  sourceType: SourceType;
  confidence: Confidence;
  publishedAt: string;
  summary: string;
};

export type CountSource = {
  sourceName: string;
  sourceUrl: string;
  sourceType: SourceType | string;
  confidence: Confidence | string;
  reportedAt: string;
  counts: CaseCounts;
  notes: string;
};

export type EventLocation = {
  locationId: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string;
  latitude: number;
  longitude: number;
  locationType: LocationType;
  description: string;
  sourceUrls: string[];
  sourceNames?: string[];
  locationPrecision?: "exact" | "city" | "county" | "state" | "country" | "unknown";
  counts?: CaseCounts;
  locationCounts?: CaseCounts;
  countSources?: CountSource[];
  countSourceUrls?: string[];
  countNotes?: string;
  metadata?: Record<string, string | number | null>;
  relatedEventIds?: string[];
};

export type PrimaryEventLocation = Omit<EventLocation, "locationId" | "description" | "sourceUrls">;

export type HantamapEvent = {
  eventId: string;
  eventName: string;
  title?: string;
  disease: "Hantavirus";
  virusType: HantamapReport["virusType"];
  transmissionType: TransmissionType;
  eventStatus: EventStatus;
  status?: ReportStatus;
  year: 2026;
  primaryLocation: PrimaryEventLocation;
  locations: EventLocation[];
  reportDate?: string;
  lastVerified?: string;
  corroborationStatus: CorroborationStatus;
  latestOfficialCounts: CaseCounts;
  latestSupplementalCounts: CaseCounts;
  countSnapshots: CountSource[];
  countSources?: CountSource[];
  sourceTiersAvailable: SourceType[];
  reportIds: string[];
  lastUpdated: string;
  summary: string;
};

export type ReportFile = {
  lastUpdated: string;
  reports: EvidenceReport[];
};

export type LocationMention = {
  name: string;
  city: string | null;
  state: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  role: LocationType;
  counts?: CaseCounts;
  metadata?: Record<string, string | number | null>;
};

export type EvidenceReport = {
  reportId: string;
  eventId: string;
  title: string;
  sourceName: string;
  sourceUrl: string;
  sourceType: SourceType;
  confidence: Confidence;
  publishedAt: string;
  retrievedAt: string;
  locationMentions: LocationMention[];
  extractedCounts: CaseCounts;
  summary: string;
  needsReview: boolean;
};

export type LocationRecord = {
  id: string;
  name?: string;
  label: string;
  country: string;
  city?: string;
  county?: string;
  region?: string;
  state?: string;
  stateCode?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  type: "city" | "county" | "state" | "zcta" | "global_city" | "country" | "region";
  population: number | null;
  aliases: string[];
};

export type CandidateReport = EvidenceReport & {
  candidateReason: string;
  discoveredAt: string;
};
