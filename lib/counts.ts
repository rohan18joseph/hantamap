import type { CaseCounts, EventLocation, HantamapEvent } from "@/lib/types";
import type { SourceFilterMode } from "@/lib/intelligence";

export function getLocationDisplayCounts(event: HantamapEvent, location: EventLocation) {
  return {
    locationCounts: normalizeCounts(location.counts || location.locationCounts),
    eventWideCounts: {
      official: normalizeCounts(event.latestOfficialCounts),
      supplemental: normalizeCounts(event.latestSupplementalCounts)
    }
  };
}

export function getEventWideCounts(event: HantamapEvent, sourceMode: SourceFilterMode): CaseCounts {
  if (sourceMode === "supplemental") return normalizeCounts(event.latestSupplementalCounts);
  if (sourceMode === "everything" || sourceMode === "official_local" || sourceMode === "needs_review") {
    return hasAnyCount(event.latestOfficialCounts) ? normalizeCounts(event.latestOfficialCounts) : normalizeCounts(event.latestSupplementalCounts);
  }
  return normalizeCounts(event.latestOfficialCounts);
}

export function normalizeCounts(counts?: Partial<CaseCounts> | null): CaseCounts {
  return {
    confirmed: counts?.confirmed ?? null,
    presumptivePositive: counts?.presumptivePositive ?? null,
    pendingConfirmation: counts?.pendingConfirmation ?? null,
    inconclusive: counts?.inconclusive ?? null,
    suspected: counts?.suspected ?? null,
    probable: counts?.probable ?? null,
    screened: counts?.screened ?? null,
    symptomatic: counts?.symptomatic ?? null,
    asymptomatic: counts?.asymptomatic ?? null,
    negative: counts?.negative ?? null,
    deaths: counts?.deaths ?? null,
    hospitalized: counts?.hospitalized ?? null,
    critical: counts?.critical ?? null,
    quarantined: counts?.quarantined ?? null,
    monitored: counts?.monitored ?? null,
    recovered: counts?.recovered ?? null,
    clearedNegative: counts?.clearedNegative ?? null,
    totalReported: counts?.totalReported ?? null
  };
}

function hasAnyCount(counts: CaseCounts) {
  return Object.values(counts).some((value) => typeof value === "number");
}
