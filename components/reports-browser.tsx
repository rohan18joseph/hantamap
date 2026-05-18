"use client";

import { useMemo, useState } from "react";
import { ReportCard } from "@/components/report-card";
import { SourceFilter } from "@/components/source-filter";
import { reportMatchesSourceMode, type SourceFilterMode } from "@/lib/intelligence";
import type { HantamapReport } from "@/lib/types";

const filters = ["sourceName", "country", "status", "confidence", "virusType"] as const;

export function ReportsBrowser({ reports, candidates = [] }: { reports: HantamapReport[]; candidates?: HantamapReport[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [date, setDate] = useState("");
  const [sourceMode, setSourceMode] = useState<SourceFilterMode>("official_local");

  const filtered = useMemo(() => {
    const pool = sourceMode === "needs_review" ? [...reports, ...candidates] : reports;
    return pool.filter((report) => {
      if (!reportMatchesSourceMode(report, sourceMode)) return false;
      const text = `${report.title} ${report.summary} ${report.locationName}`.toLowerCase();
      if (query && !text.includes(query.toLowerCase())) return false;
      if (date && report.reportDate < date) return false;
      return filters.every((key) => !selected[key] || String(report[key]) === selected[key]);
    });
  }, [reports, candidates, query, selected, date, sourceMode]);

  return (
    <div className="space-y-5">
      <section className="panel p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="kicker">Source Filter</p>
            <p className="mt-1 text-sm font-bold text-slate-500">Showing 2026 reports only</p>
          </div>
        </div>
        <SourceFilter value={sourceMode} onChange={setSourceMode} />
      </section>
      <section className="panel grid gap-3 p-4 lg:grid-cols-6">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search reports"
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold outline-none ring-teal-600 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 lg:col-span-2"
        />
        {filters.map((key) => {
          const options = Array.from(new Set([...reports, ...candidates].map((report) => String(report[key])))).sort();
          return (
            <select
              key={key}
              value={selected[key] || ""}
              onChange={(event) => setSelected((current) => ({ ...current, [key]: event.target.value }))}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">{key}</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );
        })}
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"
        />
      </section>
      <p className="text-sm font-bold text-slate-500">{filtered.length} report(s)</p>
      <section className="grid gap-4 lg:grid-cols-2">
        {filtered.length ? filtered.map((report) => <ReportCard key={report.id} report={report} />) : <EmptyReports />}
      </section>
    </div>
  );
}

function EmptyReports() {
  return (
    <div className="panel p-8 text-center lg:col-span-2">
      <p className="font-black">No reports match those filters.</p>
      <p className="subtle mt-2 text-sm">Clear a filter or try a broader query.</p>
    </div>
  );
}
