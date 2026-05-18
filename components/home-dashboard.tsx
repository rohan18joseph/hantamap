"use client";

import { useState } from "react";
import { DashboardMap } from "@/components/dashboard-map";
import { ReportCard } from "@/components/report-card";
import type { HantamapReport } from "@/lib/types";

export function HomeDashboard({ reports }: { reports: HantamapReport[] }) {
  const [focusReportId, setFocusReportId] = useState<string>();
  const feed = reports.filter((report) => report.status !== "historical").slice(0, 6);

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <DashboardMap reports={reports} focusReportId={focusReportId} />
      <aside className="panel max-h-[650px] overflow-hidden">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <p className="kicker">Intelligence Feed</p>
          <h2 className="mt-2 text-2xl font-black">Current Signals</h2>
          <p className="subtle mt-2 text-sm">Official and moderated records. Supplemental updates are labeled separately.</p>
        </div>
        <div className="h-[536px] space-y-3 overflow-y-auto p-4">
          {feed.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              action={
                <button type="button" onClick={() => setFocusReportId(report.id)} className="btn-secondary w-fit">
                  Fly to report
                </button>
              }
            />
          ))}
        </div>
      </aside>
    </section>
  );
}
