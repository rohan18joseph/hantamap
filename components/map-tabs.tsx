"use client";

export function MapTabs<T extends string>({
  tabs,
  value,
  onChange
}: {
  tabs: Array<{ id: T; label: string; count: number }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`min-h-11 shrink-0 rounded-xl border px-4 py-3 text-left text-sm font-black transition ${
            value === item.id
              ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-950"
          }`}
        >
          {item.label}
          <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{item.count}</span>
        </button>
      ))}
    </div>
  );
}
