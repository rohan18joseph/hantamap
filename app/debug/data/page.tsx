import candidatesJson from "@/data/candidate-reports.json";
import eventsJson from "@/data/events.json";
import ingestionLog from "@/data/ingestion-log.json";
import reportsJson from "@/data/reports.json";
import jurisdictionsJson from "@/data/us-jurisdictions.json";
import sourceRegistryJson from "@/data/source-registry.json";
import { explainReportMapInclusion, getRenderableEvents } from "@/lib/renderable-events";
import type { CandidateReport, EvidenceReport, HantamapEvent, ReportFile } from "@/lib/types";

export default function DebugDataPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <main className="shell py-8">
        <div className="panel p-6">
          <h1 className="text-2xl font-black">Data debug is available in development only.</h1>
        </div>
      </main>
    );
  }

  const reports = (reportsJson as ReportFile).reports;
  const events = eventsJson as HantamapEvent[];
  const candidates = candidatesJson as CandidateReport[];
  const reports2026 = reports.filter((report) => report.publishedAt.startsWith("2026-"));
  const oldReports = reports.length - reports2026.length;
  const usReports = reports2026.filter((report) => report.locationMentions.some((location) => location.country === "USA")).length;
  const canadaReports = reports2026.filter((report) => report.locationMentions.some((location) => location.country === "Canada")).length;
  const canadaEvents = events.filter((event) => event.primaryLocation.country === "Canada" || event.locations.some((location) => location.country === "Canada")).length;
  const monitored = events.reduce((sum, event) => sum + (event.latestOfficialCounts.monitored || 0) + (event.latestSupplementalCounts.monitored || 0), 0);
  const quarantined = events.reduce((sum, event) => sum + (event.latestOfficialCounts.quarantined || 0) + (event.latestSupplementalCounts.quarantined || 0), 0);
  const deaths = events.reduce((sum, event) => sum + (event.latestOfficialCounts.deaths || event.latestSupplementalCounts.deaths || 0), 0);
  const presumptivePositive = events.reduce((sum, event) => sum + (event.latestOfficialCounts.presumptivePositive || 0) + (event.latestSupplementalCounts.presumptivePositive || 0), 0);
  const pendingConfirmation = events.reduce((sum, event) => sum + (event.latestOfficialCounts.pendingConfirmation || 0) + (event.latestSupplementalCounts.pendingConfirmation || 0), 0);
  const sourceBreakdown = breakdown(reports2026);
  const missingLatLng = events.filter((event) => !Number.isFinite(event.primaryLocation.latitude) || !Number.isFinite(event.primaryLocation.longitude)).length;
  const reportsMissingEventId = reports2026.filter((report) => !report.eventId).length;
  const duplicateCandidateClusters = duplicateCount(candidates.map((candidate) => candidate.eventId));
  const may12DataRepresented =
    events.some((event) => event.lastUpdated === "2026-05-12" || event.countSnapshots.some((source) => source.reportedAt === "2026-05-12")) ||
    reports.some((report) => report.publishedAt === "2026-05-12" || report.retrievedAt === "2026-05-12") ||
    candidates.some((report) => report.publishedAt === "2026-05-12" || report.retrievedAt === "2026-05-12");
  const renderableEverything = getRenderableEvents({ sourceMode: "everything", includeCandidates: true });
  const renderableScreenings = getRenderableEvents({ sourceMode: "everything", selectedMapTab: "screenings", includeCandidates: true });
  const renderableMonitoring = getRenderableEvents({ sourceMode: "everything", selectedMapTab: "monitoring", includeCandidates: true });
  const renderableNeedsReview = getRenderableEvents({ sourceMode: "needs_review", selectedMapTab: "needs_review", includeCandidates: true });
  const inclusionChecks = ["abc11", "screening", "nebraska", "emory"].map((query) => explainReportMapInclusion(query, "everything", "screenings"));

  return (
    <main className="shell space-y-6 py-8">
      <section>
        <p className="kicker">Development Debug</p>
        <h1 className="mt-3 text-5xl font-black tracking-tight">Data Pipeline Status</h1>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DebugCard label="Events" value={events.filter((event) => event.year === 2026).length} />
        <DebugCard label="Reports" value={reports2026.length} />
        <DebugCard label="Candidates" value={candidates.filter((report) => report.publishedAt.startsWith("2026-")).length} />
        <DebugCard label="U.S. reports" value={usReports} />
        <DebugCard label="Canada events" value={canadaEvents} />
        <DebugCard label="Canada reports" value={canadaReports} />
        <DebugCard label="Monitored / quarantined" value={`${monitored} / ${quarantined}`} />
        <DebugCard label="Deaths" value={deaths} />
        <DebugCard label="Presumptive positive" value={presumptivePositive} />
        <DebugCard label="Pending confirmation" value={pendingConfirmation} />
        <DebugCard label="Filtered old reports" value={oldReports} />
        <DebugCard label="Last refresh" value={(ingestionLog as any).lastRefresh || (reportsJson as ReportFile).lastUpdated} />
        <DebugCard label="May 12 data represented" value={String(may12DataRepresented)} />
        <DebugCard label="All-state discovery jurisdictions" value={(jurisdictionsJson as any[]).length} />
        <DebugCard label="Source registry entries" value={(sourceRegistryJson as any[]).length} />
        <DebugCard label="Events missing lat/lng" value={missingLatLng} />
        <DebugCard label="Reports missing eventId" value={reportsMissingEventId} />
        <DebugCard label="Duplicate candidate clusters" value={duplicateCandidateClusters} />
        <DebugCard label="Renderable clusters" value={renderableEverything.length} />
        <DebugCard label="Renderable screenings" value={renderableScreenings.length} />
        <DebugCard label="Renderable monitoring" value={renderableMonitoring.length} />
        <DebugCard label="Needs-review clusters" value={renderableNeedsReview.length} />
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="panel p-6">
          <h2 className="text-2xl font-black">Source Type Breakdown</h2>
          <dl className="mt-4 space-y-2">
            {Object.entries(sourceBreakdown).map(([sourceType, count]) => (
              <div key={sourceType} className="flex justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold dark:bg-slate-900">
                <dt>{sourceType.replaceAll("_", " ")}</dt>
                <dd>{count}</dd>
              </div>
            ))}
          </dl>
        </article>
        <article className="panel p-6">
          <h2 className="text-2xl font-black">Source Fetch Status</h2>
          <div className="mt-4 space-y-2">
            {((ingestionLog as any).sourceResults || []).map((result: any) => (
              <div key={`${result.name}-${result.url}`} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                <div className="flex justify-between gap-3 font-black">
                  <span>{result.name}</span>
                  <span>{result.ok ? "ok" : "failed"}</span>
                </div>
                <p className="mt-1 break-all text-xs text-slate-500">{result.url}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">Matched: {result.matchedItems || 0} · URLs: {result.discoveredUrls || 0}</p>
                {result.error ? <p className="mt-1 text-xs font-bold text-red-600">{result.error}</p> : null}
              </div>
            ))}
          </div>
        </article>
      </section>
      <article className="panel p-6">
        <h2 className="text-2xl font-black">Dark-Mode Map Control Checklist</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {["Legend has opaque background", "Zoom controls readable", "Tooltips readable", "Popups readable", "Layer buttons readable", "Cluster badges visible"].map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold dark:border-slate-800 dark:bg-slate-950">
              {item}
            </div>
          ))}
        </div>
      </article>
      <article className="panel p-6">
        <h2 className="text-2xl font-black">Why Is This Report Not On The Map?</h2>
        <p className="subtle mt-2 text-sm">These checks use the same renderable-event pipeline as Risk Lens and Map View.</p>
        <div className="mt-4 space-y-3">
          {inclusionChecks.map((check: any) => (
            <div key={check.query} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <strong>{check.found ? check.title : `No report matched "${check.query}"`}</strong>
                <span className={`rounded-full px-2 py-1 text-xs font-black ${check.includedInRenderableEvents ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"}`}>
                  {check.includedInRenderableEvents ? "included" : "excluded"}
                </span>
              </div>
              {check.found ? (
                <>
                  <p className="mt-2 text-xs text-slate-500">
                    reportId {check.reportId} · eventId {String(check.hasEventId)} · location {String(check.hasLocation)} · lat/lng {String(check.hasLatLng)}
                  </p>
                  <p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">Categories: {(check.categories || []).join(", ") || "none"}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Source mode {check.sourceMode} · tab {check.selectedMapTab} · clusters {(check.includedClusters || []).map((cluster: any) => `${cluster.title} at ${cluster.location}`).join("; ") || check.reasonExcluded}
                  </p>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </article>
      <article className="panel p-6">
        <h2 className="text-2xl font-black">All-State Discovery Status</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {((ingestionLog as any).debug?.allStateDiscoveryStatus || []).map((item: any) => (
            <div key={item.abbreviation} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
              <strong>{item.jurisdiction}</strong>
              <p className="mt-1 text-xs text-slate-500">queries {item.queryCount} · reports {item.reportCount} · candidates {item.candidateCount}</p>
            </div>
          ))}
        </div>
      </article>
    </main>
  );
}

function duplicateCount(values: string[]) {
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
  return Object.values(counts).filter((count) => count > 1).length;
}

function DebugCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="panel p-5">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <strong className="mt-3 block text-2xl">{value}</strong>
    </div>
  );
}

function breakdown(reports: EvidenceReport[]) {
  return reports.reduce<Record<string, number>>((acc, report) => {
    acc[report.sourceType] = (acc[report.sourceType] || 0) + 1;
    return acc;
  }, {});
}
