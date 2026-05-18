"use client";

import { CountBadge } from "@/components/count-badge";
import { ReportBadges } from "@/components/badges";
import { countLabel, primaryCount } from "@/lib/intelligence";
import { formatDate } from "@/lib/geo";
import type { HantamapReport } from "@/lib/types";

export function EventClusterCard({
  report,
  active,
  onSelect
}: {
  report: HantamapReport;
  active?: boolean;
  onSelect: () => void;
}) {
  const evidenceCount = report.countSources.length;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-soft ${
        active
          ? "border-teal-500 bg-teal-50 dark:bg-teal-950/40"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
      }`}
    >
      <ReportBadges report={report} />
      <strong className="mt-3 block">{report.title}</strong>
      <p className="subtle mt-2 line-clamp-2 text-sm">{report.summary}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <CountBadge label="Evidence" value={evidenceCount} />
        <CountBadge label="Total" value={primaryCount(report)} />
        <CountBadge label="Confirmed" value={report.caseCounts.confirmed} />
        <CountBadge label="Presumptive" value={report.caseCounts.presumptivePositive} />
        <CountBadge label="Pending" value={report.caseCounts.pendingConfirmation} />
        <CountBadge label="Screened" value={report.caseCounts.screened} />
        <CountBadge label="Deaths" value={report.caseCounts.deaths} />
        <CountBadge label="Monitored" value={report.caseCounts.monitored} />
        <CountBadge label="Quarantined" value={report.caseCounts.quarantined} />
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
        <span>{report.locationName}</span>
        <span>{formatDate(report.reportDate)}</span>
        <span>{countLabel(primaryCount(report))} people/cases reported by source snapshots</span>
      </div>
    </button>
  );
}
