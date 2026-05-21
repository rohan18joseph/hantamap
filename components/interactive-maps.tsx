"use client";

import { useMemo, useState } from "react";
import { Activity, AlertTriangle, BadgeCheck, ClipboardCheck, Plane, Skull } from "lucide-react";
import { DashboardMap } from "@/components/dashboard-map";
import { EventClusterCard } from "@/components/event-cluster-card";
import { MapTabs } from "@/components/map-tabs";
import { SourceFilter } from "@/components/source-filter";
import { StatCard } from "@/components/stat-card";
import { formatRefreshTimeUtc } from "@/lib/geo";
import { hasCount, reportMatchesSourceMode, type SourceFilterMode } from "@/lib/intelligence";
import type { EventCategory } from "@/lib/types";
import type { HantamapReport } from "@/lib/types";

type MapTab = "all" | "confirmed" | "suspected" | "screenings" | "monitoring" | "deaths" | "advisories" | "travel" | "needs_review";

const tabs: Array<{ id: MapTab; label: string; description: string }> = [
  { id: "all", label: "All", description: "All renderable 2026 event clusters for the selected source mode." },
  { id: "confirmed", label: "Confirmed", description: "Confirmed case or cluster records. Supplemental evidence remains labeled separately." },
  { id: "suspected", label: "Suspected / probable / presumptive", description: "Suspected, probable, presumptive-positive, or symptomatic screening clusters kept separate from confirmed cases." },
  { id: "screenings", label: "Screenings / testing", description: "Screenings, pending confirmation, inconclusive tests, negative screenings, symptomatic screenings, and hospital evaluations." },
  { id: "monitoring", label: "Quarantine/monitoring", description: "Monitoring, quarantine, or passenger follow-up signals." },
  { id: "deaths", label: "Deaths", description: "Clusters with source-backed death counts or death-associated evidence." },
  { id: "advisories", label: "Advisories", description: "Official advisories, health guidance, and advisory-region records." },
  { id: "travel", label: "Travel-linked", description: "Travel routes, exposure locations, and cruise-linked signals." },
  { id: "needs_review", label: "Needs review", description: "Candidate or discovery clusters that need manual review." }
];

export function InteractiveMaps({ reports, candidates = [], lastUpdated }: { reports: HantamapReport[]; candidates?: HantamapReport[]; lastUpdated: string }) {
  const [tab, setTab] = useState<MapTab>("all");
  const [sourceMode, setSourceMode] = useState<SourceFilterMode>("official_local");
  const [focusReportId, setFocusReportId] = useState<string>();

  const sourcePool = useMemo(() => {
    const all = uniqueReports(sourceMode === "needs_review" ? [...reports, ...candidates] : reports);
    return all.filter((report) => reportMatchesSourceMode(report, sourceMode) || report.sourceModeEligibility?.includes(sourceMode));
  }, [candidates, reports, sourceMode]);

  const visibleReports = useMemo(() => sortReports(filterReports(sourcePool, tab), tab), [sourcePool, tab]);
  const counts = useMemo(() => mapCounts(sourcePool), [sourcePool]);
  const activeTab = tabs.find((item) => item.id === tab) || tabs[0];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Confirmed clusters" value={counts.confirmed} icon={BadgeCheck} />
        <StatCard label="Screening clusters" value={counts.screenings} icon={ClipboardCheck} />
        <StatCard label="Deaths" value={counts.deaths} icon={Skull} />
        <StatCard label="Monitored / quarantined" value={counts.monitoring} icon={Activity} />
        <StatCard label="Travel-linked" value={counts.travel} icon={Plane} />
      </section>

      <section className="panel p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="kicker">Source Filter</p>
            <h2 className="mt-2 text-2xl font-black">Choose the evidence tier</h2>
            <p className="subtle mt-2 text-sm">Default is official plus local health. Reports are evidence, not case counts.</p>
          </div>
          <span className="self-start rounded-full border border-slate-200 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:border-slate-800">
            2026 only · Last refreshed {formatRefreshTimeUtc(lastUpdated)}
          </span>
        </div>
        <SourceFilter value={sourceMode} onChange={setSourceMode} className="mt-4" />
      </section>

      <section className="panel p-3">
        <MapTabs
          tabs={tabs.map((item) => ({ id: item.id, label: item.label, count: filterReports(sourcePool, item.id).length }))}
          value={tab}
          onChange={setTab}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_430px]">
        <DashboardMap reports={visibleReports} focusReportId={focusReportId} heightClass="h-[62dvh] min-h-[430px] md:h-[64dvh] xl:h-[720px]" initialHistorical={tab === "all"} />
        <aside className="panel overflow-hidden">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <p className="kicker">Interactive Case Map</p>
            <h2 className="mt-2 text-2xl font-black">{activeTab.label}</h2>
            <p className="subtle mt-2 text-sm">{activeTab.description}</p>
          </div>
          <div className="max-h-[600px] space-y-3 overflow-y-auto p-4">
            {visibleReports.length ? (
              visibleReports.map((report) => (
                <EventClusterCard
                  key={report.id}
                  report={report}
                  active={focusReportId === report.id}
                  onSelect={() => setFocusReportId(report.id)}
                />
              ))
            ) : (
              <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                <div>
                  <AlertTriangle className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-3 font-black">No reports found in this view.</p>
                  <p className="subtle mt-2 text-sm">Try Everything or Needs Review to include local reports, screenings, and candidate clusters.</p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}

function filterReports(reports: HantamapReport[], tab: MapTab) {
  switch (tab) {
    case "confirmed":
      return reports.filter((report) => hasCategory(report, ["confirmed_case", "confirmed_cluster"]) || hasCount(report, "confirmed"));
    case "suspected":
      return reports.filter((report) => hasCategory(report, ["suspected_case", "probable_case", "symptomatic_screening"]) || hasCount(report, "suspected") || hasCount(report, "probable") || hasCount(report, "presumptivePositive") || hasCount(report, "pendingConfirmation"));
    case "screenings":
      return reports.filter((report) => hasCategory(report, ["screening", "negative_screening", "symptomatic_screening", "hospital_evaluation"]) || hasCount(report, "screened") || hasCount(report, "negative") || hasCount(report, "inconclusive") || hasCount(report, "pendingConfirmation") || hasCount(report, "presumptivePositive"));
    case "monitoring":
      return reports.filter((report) => hasCategory(report, ["monitoring", "quarantine"]) || hasCount(report, "quarantined") || hasCount(report, "monitored"));
    case "deaths":
      return reports.filter((report) => hasCategory(report, ["death"]) || hasCount(report, "deaths"));
    case "advisories":
      return reports.filter((report) => hasCategory(report, ["advisory"]) || report.status === "active_advisory" || report.locationType === "advisory_region");
    case "travel":
      return reports.filter((report) => hasCategory(report, ["travel_linked_report", "exposure_location"]) || report.transmissionType === "person_to_person_possible");
    case "needs_review":
      return reports.filter((report) => hasCategory(report, ["needs_review"]) || report.sourceType === "discovery" || report.corroborationStatus === "needs_review");
    default:
      return reports;
  }
}

function sortReports(reports: HantamapReport[], tab: MapTab) {
  return [...reports].sort((a, b) => {
    if (tab === "confirmed") {
      const rank = (report: HantamapReport) => (["official", "national_health_agency"].includes(report.sourceType) ? 4 : 0) + (report.confidence === "high" ? 2 : 0);
      return rank(b) - rank(a) || b.reportDate.localeCompare(a.reportDate);
    }
    return b.reportDate.localeCompare(a.reportDate);
  });
}

function mapCounts(reports: HantamapReport[]) {
  return {
    confirmed: filterReports(reports, "confirmed").length,
    screenings: filterReports(reports, "screenings").length,
    advisories: filterReports(reports, "advisories").length,
    travel: filterReports(reports, "travel").length,
    deaths: filterReports(reports, "deaths").reduce((sum, report) => sum + (report.caseCounts.deaths || 0), 0) || filterReports(reports, "deaths").length,
    monitoring: filterReports(reports, "monitoring").length
  };
}

function hasCategory(report: HantamapReport, categories: EventCategory[]) {
  return categories.some((category) => report.categories?.includes(category));
}

function uniqueReports(reports: HantamapReport[]) {
  return Array.from(new Map(reports.map((report) => [report.id, report])).values());
}
