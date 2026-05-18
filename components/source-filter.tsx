"use client";

import { AlertTriangle } from "lucide-react";
import { isSupplementalMode, sourceFilterOptions, type SourceFilterMode } from "@/lib/intelligence";

export function SourceFilter({
  value,
  onChange,
  className = ""
}: {
  value: SourceFilterMode;
  onChange: (value: SourceFilterMode) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {sourceFilterOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`rounded-xl border px-3 py-2 text-sm font-black transition ${
              value === option.id
                ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700"
            }`}
            title={option.description}
          >
            {option.label}
          </button>
        ))}
      </div>
      {isSupplementalMode(value) ? (
        <div className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>This view includes third-party or supplemental reports that may not be officially confirmed.</span>
        </div>
      ) : null}
    </div>
  );
}
