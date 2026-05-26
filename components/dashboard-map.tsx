"use client";

import dynamic from "next/dynamic";
import type { HantamapReport, LocationRecord } from "@/lib/types";

const HantamapMapClient = dynamic(() => import("@/components/hantamap-map-client").then((mod) => mod.HantamapMapClient), {
  ssr: false,
  loading: () => (
    <div className="grid h-[650px] place-items-center rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-teal-600/30" />
        <p className="mt-3 text-sm font-bold text-slate-500">Loading interactive map...</p>
      </div>
    </div>
  )
});

export type DashboardMapProps = {
  reports: HantamapReport[];
  selectedLocation?: LocationRecord;
  focusReportId?: string;
  heightClass?: string;
  initialHistorical?: boolean;
  resizeKey?: string;
};

export function DashboardMap(props: DashboardMapProps) {
  return <HantamapMapClient {...props} />;
}
