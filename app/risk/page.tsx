import { RiskLens } from "@/components/risk-lens";
import { getReportFile } from "@/lib/data";

export default async function RiskPage() {
  const { reports, lastUpdated } = await getReportFile();

  return (
    <main className="shell space-y-8 py-8">
      <section>
        <p className="kicker">Risk Lens</p>
        <h1 className="mt-3 text-5xl font-black tracking-tight">Hantamap Brief</h1>
        <p className="subtle mt-4 max-w-3xl text-lg">
          Enter a ZIP, city, state, country, or major location. The brief uses only location-based public-health signals and never asks for a personal questionnaire.
        </p>
      </section>
      <RiskLens reports={reports} lastUpdated={lastUpdated} />
    </main>
  );
}
