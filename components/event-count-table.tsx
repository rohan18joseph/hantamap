import { CountBadge, countRows } from "@/components/count-badge";
import { collectCountSources, latestOfficialCounts, latestSupplementalCounts } from "@/lib/intelligence";
import { formatDate } from "@/lib/geo";
import type { HantamapReport } from "@/lib/types";

export function EventCountTable({ reports }: { reports: HantamapReport[] }) {
  const official = latestOfficialCounts(reports);
  const supplemental = latestSupplementalCounts(reports);
  const sources = collectCountSources(reports);
  const conflicting = hasConflicts(reports);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-black">Event Counts</h3>
        {conflicting ? (
          <span className="badge bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800">
            Count sources differ
          </span>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <CountBlock title="Latest official count" counts={official} />
        <CountBlock title="Latest supplemental count" counts={supplemental} />
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Count Source History
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {sources.length ? sources.map((source) => (
            <div key={`${source.sourceUrl}-${source.reportedAt}`} className="grid gap-3 p-4 lg:grid-cols-[1fr_1.3fr]">
              <div>
                <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="font-black hover:text-teal-700 dark:hover:text-teal-300">
                  {source.sourceName}
                </a>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {source.sourceType} · {source.confidence} · {formatDate(source.reportedAt)}
                </p>
                {source.notes ? <p className="subtle mt-2 text-sm">{source.notes}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {countRows.filter((row) => source.counts[row.key] !== null && source.counts[row.key] !== undefined).map((row) => (
                  <CountBadge key={row.key} label={row.label} value={source.counts[row.key]} />
                ))}
              </div>
            </div>
          )) : (
            <p className="p-4 text-sm font-bold text-slate-500">No count source history supplied.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function CountBlock({ title, counts }: { title: string; counts: ReturnType<typeof latestOfficialCounts> }) {
  const visibleRows = countRows.filter((row) => counts[row.key] !== null && counts[row.key] !== undefined);
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {visibleRows.length ? visibleRows.map((row) => <CountBadge key={row.key} label={row.label} value={counts[row.key]} />) : (
          <span className="text-sm font-bold text-slate-500">No separate count available</span>
        )}
      </div>
    </div>
  );
}

function hasConflicts(reports: HantamapReport[]) {
  const sources = collectCountSources(reports);
  return countRows.some((row) => {
    const values = new Set(sources.map((source) => source.counts[row.key]).filter((value) => value !== null && value !== undefined));
    return values.size > 1;
  });
}
