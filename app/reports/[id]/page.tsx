import { notFound } from "next/navigation";
import { DashboardMap } from "@/components/dashboard-map";
import { ReportBadges } from "@/components/badges";
import { EventCountTable } from "@/components/event-count-table";
import { EvidencePanel } from "@/components/evidence-panel";
import { getCandidateReportsAsReports, getEvidenceReportsAsReports, getReport, getReports } from "@/lib/data";
import { formatDate } from "@/lib/geo";

export async function generateStaticParams() {
  const reports = await getReports();
  const evidence = await getEvidenceReportsAsReports();
  const candidates = await getCandidateReportsAsReports();
  return [...reports, ...evidence, ...candidates].map((report) => ({ id: report.id }));
}

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [report, reports, evidenceReports, candidates] = await Promise.all([getReport(id), getReports(), getEvidenceReportsAsReports(), getCandidateReportsAsReports()]);
  if (!report) notFound();
  const eventReports = [...reports, ...evidenceReports, ...candidates].filter((item) => item.eventId === report.eventId);

  return (
    <main className="shell grid gap-6 py-8 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="space-y-6">
        <div className="panel p-6">
          <p className="kicker">Report Detail</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">{report.title}</h1>
          <div className="mt-4">
            <ReportBadges report={report} />
          </div>
          <p className="subtle mt-5 text-lg">{report.summary}</p>
          <a href={report.sourceUrl} target="_blank" rel="noreferrer" className="btn-primary mt-6">
            Open source
          </a>
        </div>
        <div className="panel p-6">
          <h2 className="text-2xl font-black">Why this location matters</h2>
          <p className="subtle mt-3">
            Hantamap scores this as {report.locationType.replaceAll("_", " ")} context from a {report.confidence}-confidence source. Active reports are shown separately from historical data and supplemental updates.
          </p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Location", report.locationName],
              ["Country", report.country],
              ["Report date", formatDate(report.reportDate)],
              ["Last verified", formatDate(report.lastVerified)],
              ["Source tier", report.sourceType.replaceAll("_", " ")],
              ["Corroboration", report.corroborationStatus.replaceAll("_", " ")]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                <dt className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</dt>
                <dd className="mt-2 font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="panel p-6">
          <EventCountTable reports={eventReports.length ? eventReports : [report]} />
        </div>
        <div className="panel p-6">
          <EvidencePanel reports={eventReports.length ? eventReports : [report]} />
        </div>
        <div className="panel p-6">
          <h2 className="text-2xl font-black">Related Locations Timeline</h2>
          <div className="mt-5 space-y-3">
            {report.relatedLocations.length ? report.relatedLocations.map((location, index) => (
              <div key={`${report.id}-timeline-${location.type}-${location.name}-${location.date}-${location.sourceUrl}-${index}`} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <strong>{location.name}</strong>
                <p className="subtle mt-1 text-sm">{formatDate(location.date)} - {location.description}</p>
              </div>
            )) : <p className="subtle">No related locations supplied.</p>}
          </div>
        </div>
      </section>
      <DashboardMap reports={reports} focusReportId={report.id} heightClass="h-[860px]" />
    </main>
  );
}
