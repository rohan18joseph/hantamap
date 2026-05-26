import { AlertTriangle, Clock3, HeartCrack, ShieldCheck, UsersRound, Activity } from "lucide-react";
import { activeReports } from "@/lib/data";
import { formatDateTime } from "@/lib/geo";
import { dedupeByEvent } from "@/lib/intelligence";
import type { HantamapReport } from "@/lib/types";

export function StatCards({ reports, lastUpdated }: { reports: HantamapReport[]; lastUpdated: string }) {
  const active = activeReports(reports);
  const advisories = reports.filter((report) => report.status === "active_advisory");
  const p2p = reports.filter((report) => report.transmissionType === "person_to_person_possible");
  const officialConfirmed = dedupeByEvent(active.filter((report) => ["official", "national_health_agency"].includes(report.sourceType)));
  const deathAssociated = dedupeByEvent(reports.filter((report) => (report.caseCounts.deaths || 0) > 0));
  const monitoring = dedupeByEvent(reports.filter((report) => (report.caseCounts.monitored || 0) > 0 || (report.caseCounts.quarantined || 0) > 0));
  const cards = [
    ["Active verified reports", officialConfirmed.length, ShieldCheck],
    ["Active advisories", advisories.length, AlertTriangle],
    ["Death-associated events", deathAssociated.length, HeartCrack],
    ["Monitoring/quarantine events", monitoring.length, Activity],
    ["Person-to-person relevant events", p2p.length, UsersRound],
    ["Last data refresh", formatDateTime(lastUpdated), Clock3]
  ] as const;

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map(([label, value, Icon]) => (
        <div key={label} className="panel overflow-hidden p-5">
          <div className="grid grid-cols-[minmax(0,1fr)_2.5rem] items-start gap-3">
            <span className="min-w-0 text-sm font-bold leading-5 text-slate-500 dark:text-slate-400">{label}</span>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <Icon className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 text-2xl font-black tracking-tight">{value}</div>
        </div>
      ))}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950 md:col-span-2 xl:col-span-3 2xl:col-span-6">
        Showing 2026 reports only. Official dashboard counts deduplicate by event and use WHO, CDC, ECDC, or national public-health agency records.
      </div>
    </section>
  );
}
