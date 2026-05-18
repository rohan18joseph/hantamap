import Link from "next/link";
import type React from "react";
import { ReportBadges } from "@/components/badges";
import { CountBadge } from "@/components/count-badge";
import { formatDate } from "@/lib/geo";
import { primaryCount } from "@/lib/intelligence";
import type { HantamapReport } from "@/lib/types";

export function ReportCard({
  report,
  action
}: {
  report: HantamapReport;
  action?: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-soft dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-3">
        <ReportBadges report={report} />
        <div>
          <Link href={`/reports/${report.id}`} className="text-lg font-black hover:text-teal-700 dark:hover:text-teal-300">
            {report.title}
          </Link>
          <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-400">{report.summary}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-500 sm:grid-cols-4">
          <span>{report.locationName}</span>
          <span>{report.virusType}</span>
          <span>{primaryCount(report) ?? "No count"} reported</span>
          <span>{formatDate(report.reportDate)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <CountBadge label="Confirmed" value={report.caseCounts.confirmed} />
          <CountBadge label="Probable" value={report.caseCounts.probable} />
          <CountBadge label="Deaths" value={report.caseCounts.deaths} />
        </div>
        {action}
      </div>
    </article>
  );
}
