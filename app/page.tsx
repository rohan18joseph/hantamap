import Link from "next/link";
import { DataFreshnessBadge } from "@/components/data-freshness-badge";
import { HomeDashboard } from "@/components/home-dashboard";
import { StatCards } from "@/components/stat-cards";
import { getReportFile } from "@/lib/data";

export default async function HomePage() {
  const { reports, lastUpdated } = await getReportFile();

  return (
    <main className="shell space-y-8 py-8">
      <section className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
        <div>
          <p className="kicker">Independent data visualization</p>
          <h1 className="mt-3 max-w-4xl text-5xl font-black tracking-tight sm:text-6xl">
            2026 hantavirus reports organized by event, location, and source.
          </h1>
          <p className="subtle mt-5 max-w-3xl text-lg">
            This project explores how public health reports, local news, and official advisories can be organized into a map-based view of 2026 hantavirus-related events. It is not an official public health source.
          </p>
          <div className="mt-5">
            <DataFreshnessBadge lastUpdated={lastUpdated} />
          </div>
        </div>
        <div className="panel p-5">
          <p className="font-black">Location-based brief</p>
          <p className="subtle mt-2 text-sm">
            The Hantamap Brief uses event-level people counts, proximity, source confidence, recency, and monitoring signals. It is informational and not medical advice.
          </p>
          <Link href="/risk" className="btn-primary mt-5 w-full">
            Open Risk Lens
          </Link>
          <Link href="/maps" className="btn-secondary mt-3 w-full">
            Explore Interactive Maps
          </Link>
        </div>
      </section>
      <StatCards reports={reports} lastUpdated={lastUpdated} />
      <HomeDashboard reports={reports} />
    </main>
  );
}
