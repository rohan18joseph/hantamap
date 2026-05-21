import { InteractiveMaps } from "@/components/interactive-maps";
import { DataFreshnessBadge } from "@/components/data-freshness-badge";
import { getReportFile } from "@/lib/data";

export default async function MapsPage() {
  const { reports, lastUpdated } = await getReportFile();

  return (
    <main className="shell space-y-8 py-8">
      <section>
        <p className="kicker">Interactive Maps</p>
        <h1 className="mt-3 max-w-4xl text-5xl font-black tracking-tight">Separate signals by confidence, status, and transmission relevance.</h1>
        <p className="subtle mt-4 max-w-3xl text-lg">
          Explore confirmed reports, suspected or supplemental signals, active advisories, monitoring records, and person-to-person relevant events without mixing their certainty levels.
        </p>
        <div className="mt-5">
          <DataFreshnessBadge lastUpdated={lastUpdated} />
        </div>
      </section>
      <InteractiveMaps reports={reports} lastUpdated={lastUpdated} />
    </main>
  );
}
