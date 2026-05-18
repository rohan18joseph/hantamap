import { formatDateTime } from "@/lib/geo";

export function DataFreshnessBadge({ lastUpdated }: { lastUpdated: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
        2026 only
      </span>
      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
        Last refreshed {formatDateTime(lastUpdated)}
      </span>
    </div>
  );
}
