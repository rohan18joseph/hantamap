import type { HantamapReport, ReportStatus } from "@/lib/types";

export function statusLabel(status: ReportStatus) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function statusClasses(status: ReportStatus) {
  switch (status) {
    case "confirmed_cluster":
    case "confirmed_case":
      return "bg-red-100 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-800";
    case "active_advisory":
      return "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800";
    case "monitoring":
    case "probable":
    case "suspected":
      return "bg-blue-100 text-blue-800 ring-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:ring-blue-800";
    case "supplemental_update":
      return "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700";
  }
}

export function sourceBadge(report: HantamapReport) {
  if (report.sourceType === "official") return "Official";
  if (report.sourceType === "national_health_agency") return "National health agency";
  if (report.sourceType === "state_health_department") return "State health department";
  if (report.sourceType === "local_health_department") return "Local health department";
  if (report.sourceType === "health_system") return "Health system";
  if (report.sourceType === "moderated") return "Moderated";
  if (report.sourceType === "discovery") return "Needs review";
  return "Supplemental";
}

export function markerColor(status: ReportStatus) {
  switch (status) {
    case "confirmed_cluster":
    case "confirmed_case":
      return "#dc2626";
    case "active_advisory":
      return "#d97706";
    case "monitoring":
    case "probable":
    case "suspected":
      return "#2563eb";
    case "supplemental_update":
      return "#475569";
    default:
      return "#64748b";
  }
}
