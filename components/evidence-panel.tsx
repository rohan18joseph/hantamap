import { ExternalLink } from "lucide-react";
import { collectCountSources } from "@/lib/intelligence";
import { formatDate } from "@/lib/geo";
import type { HantamapReport } from "@/lib/types";

export function EvidencePanel({ reports }: { reports: HantamapReport[] }) {
  const sources = collectCountSources(reports);
  return (
    <section>
      <h3 className="text-lg font-black">Evidence</h3>
      <div className="mt-3 space-y-2">
        {sources.length ? sources.map((source) => (
          <a
            key={`${source.sourceUrl}-${source.reportedAt}`}
            href={source.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-3 text-sm transition hover:border-teal-500 dark:border-slate-800 dark:hover:border-teal-500"
          >
            <span>
              <strong>{source.sourceName}</strong>
              <span className="ml-2 text-xs font-bold text-slate-500">
                {source.sourceType} · {source.confidence} · {formatDate(source.reportedAt)}
              </span>
            </span>
            <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
          </a>
        )) : (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm font-bold text-slate-500 dark:border-slate-700">
            No evidence links supplied.
          </p>
        )}
      </div>
    </section>
  );
}
