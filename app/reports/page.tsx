import { ReportsBrowser } from "@/components/reports-browser";
import { DataFreshnessBadge } from "@/components/data-freshness-badge";
import { getCandidateReportsAsReports, getEvidenceReportsAsReports, getReportFile } from "@/lib/data";

export default async function ReportsPage() {
  const [reports, candidates, reportFile] = await Promise.all([getEvidenceReportsAsReports(), getCandidateReportsAsReports(), getReportFile()]);
  return (
    <main className="shell space-y-8 py-8">
      <section>
        <p className="kicker">Reports</p>
        <h1 className="mt-3 text-5xl font-black tracking-tight">Hantavirus Report Feed</h1>
        <p className="subtle mt-4 max-w-3xl text-lg">
          Source-linked records with explicit confidence labels. Supplemental updates are not treated as official confirmed reports.
        </p>
        <div className="mt-5">
          <DataFreshnessBadge lastUpdated={reportFile.lastUpdated} />
        </div>
      </section>
      <ReportsBrowser reports={reports} candidates={candidates} />
    </main>
  );
}
