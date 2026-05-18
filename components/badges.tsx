import type { HantamapReport } from "@/lib/types";
import { sourceBadge, statusClasses, statusLabel } from "@/lib/style";

export function StatusBadge({ report }: { report: HantamapReport }) {
  return <span className={`badge ${statusClasses(report.status)}`}>{statusLabel(report.status)}</span>;
}

export function SourceBadge({ report }: { report: HantamapReport }) {
  const tone =
    report.sourceType === "official" || report.sourceType === "national_health_agency"
      ? "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800"
      : report.sourceType === "state_health_department" || report.sourceType === "local_health_department" || report.sourceType === "health_system"
        ? "bg-cyan-100 text-cyan-800 ring-cyan-200 dark:bg-cyan-950 dark:text-cyan-200 dark:ring-cyan-800"
      : report.sourceType === "moderated"
        ? "bg-blue-100 text-blue-800 ring-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:ring-blue-800"
        : report.sourceType === "discovery"
          ? "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
          : "bg-violet-100 text-violet-800 ring-violet-200 dark:bg-violet-950 dark:text-violet-200 dark:ring-violet-800";
  return <span className={`badge ${tone}`}>{sourceBadge(report)}</span>;
}

export function ConfidenceBadge({ report }: { report: HantamapReport }) {
  return (
    <span className="badge bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
      {report.confidence} confidence
    </span>
  );
}

export function ReportBadges({ report }: { report: HantamapReport }) {
  return (
    <div className="flex flex-wrap gap-2">
      <StatusBadge report={report} />
      <SourceBadge report={report} />
      <ConfidenceBadge report={report} />
      <span className="badge bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
        {report.corroborationStatus.replaceAll("_", " ")}
      </span>
      {report.transmissionType === "person_to_person_possible" ? (
        <span className="badge bg-red-100 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-800">
          Person-to-person possible
        </span>
      ) : null}
      {report.locationType === "travel_route" ? (
        <span className="badge bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-800">
          Travel-linked
        </span>
      ) : null}
      {report.status === "historical" ? (
        <span className="badge bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
          Historical
        </span>
      ) : null}
    </div>
  );
}
