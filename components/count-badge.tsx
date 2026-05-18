import type { CaseCounts } from "@/lib/types";

export function CountBadge({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span>{value === null || value === undefined ? "n/a" : value}</span>
    </span>
  );
}

export const countRows: Array<{ key: keyof CaseCounts; label: string }> = [
  { key: "confirmed", label: "Confirmed" },
  { key: "presumptivePositive", label: "Presumptive positive" },
  { key: "pendingConfirmation", label: "Pending confirmation" },
  { key: "inconclusive", label: "Inconclusive" },
  { key: "suspected", label: "Suspected" },
  { key: "probable", label: "Probable" },
  { key: "screened", label: "Screened" },
  { key: "symptomatic", label: "Symptomatic" },
  { key: "asymptomatic", label: "Asymptomatic" },
  { key: "negative", label: "Negative" },
  { key: "deaths", label: "Deaths" },
  { key: "hospitalized", label: "Hospitalized" },
  { key: "critical", label: "Critical" },
  { key: "quarantined", label: "Quarantined" },
  { key: "monitored", label: "Monitored" },
  { key: "recovered", label: "Recovered" },
  { key: "clearedNegative", label: "Cleared negative" },
  { key: "totalReported", label: "Total reported" }
];
