import type { LucideIcon } from "lucide-react";

export function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{label}</span>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-4 text-2xl font-black tracking-tight">{value}</div>
    </div>
  );
}
