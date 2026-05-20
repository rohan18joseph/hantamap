"use client";

import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import { ReportBadges } from "@/components/badges";
import { CountBadge } from "@/components/count-badge";
import { EventCountTable } from "@/components/event-count-table";
import { EvidencePanel } from "@/components/evidence-panel";
import { formatDate } from "@/lib/geo";
import type { HantamapReport } from "@/lib/types";

export function ReportDrawer({ report, onClose }: { report?: HantamapReport; onClose: () => void }) {
  return (
    <aside
      className={`fixed inset-x-0 bottom-0 z-[700] h-[min(82dvh,760px)] w-full transform rounded-t-3xl border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl transition dark:border-slate-800 dark:bg-slate-950 sm:inset-y-0 sm:left-auto sm:right-0 sm:h-auto sm:max-w-xl sm:rounded-none sm:border-l sm:border-t-0 sm:pb-0 ${
        report ? "translate-y-0 sm:translate-x-0 sm:translate-y-0" : "translate-y-full sm:translate-x-full sm:translate-y-0"
      }`}
      aria-hidden={!report}
    >
      {report ? (
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
            <div>
              <p className="kicker">Report Detail</p>
              <h2 className="mt-1 text-xl font-black">{report.title}</h2>
            </div>
            <button type="button" onClick={onClose} className="btn-secondary min-h-11 min-w-11 shrink-0 px-3" aria-label="Close report drawer">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-5">
            <ReportBadges report={report} />
            <p className="subtle">{report.summary}</p>
            {report.categories?.length ? (
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-black">Why this appears on the map</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {report.categories.map((category) => (
                    <span key={category} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-black capitalize text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                      {category.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
                {report.renderReason ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{report.renderReason}</p> : null}
                <p className="mt-2 text-xs font-bold text-slate-500">Articles are evidence. Counts below are people counts from source snapshots.</p>
              </section>
            ) : null}
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {[
                ["Location", report.locationName],
                ["Country", report.country],
                ["Virus", report.virusType],
                ["Transmission", report.transmissionType.replaceAll("_", " ")],
                ["Source tier", report.sourceType.replaceAll("_", " ")],
                ["Corroboration", report.corroborationStatus.replaceAll("_", " ")],
                ["Confidence", report.confidence],
                ["Report date", formatDate(report.reportDate)],
                ["Last verified", formatDate(report.lastVerified)]
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                  <dt className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</dt>
                  <dd className="mt-1 font-bold">{value}</dd>
                </div>
              ))}
            </dl>
            <section>
              <h3 className="font-black">Location-specific counts</h3>
              <p className="mt-1 text-xs font-bold text-slate-500">These counts apply to this marker/location only. Event-wide outbreak counts are shown separately below.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <CountBadge label="Confirmed" value={report.caseCounts.confirmed} />
                <CountBadge label="Presumptive positive" value={report.caseCounts.presumptivePositive} />
                <CountBadge label="Pending confirmation" value={report.caseCounts.pendingConfirmation} />
                <CountBadge label="Inconclusive" value={report.caseCounts.inconclusive} />
                <CountBadge label="Suspected" value={report.caseCounts.suspected} />
                <CountBadge label="Probable" value={report.caseCounts.probable} />
                <CountBadge label="Screened" value={report.caseCounts.screened} />
                <CountBadge label="Symptomatic" value={report.caseCounts.symptomatic} />
                <CountBadge label="Negative" value={report.caseCounts.negative} />
                <CountBadge label="Deaths" value={report.caseCounts.deaths} />
                <CountBadge label="Quarantined" value={report.caseCounts.quarantined} />
                <CountBadge label="Monitored" value={report.caseCounts.monitored} />
              </div>
            </section>
            {report.eventWideCountSources?.length ? (
              <section>
                <h3 className="font-black">Event-wide count snapshots</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">These describe the overall MV Hondius event and are not copied to each location marker.</p>
                <div className="mt-3 space-y-2">
                  {report.eventWideCountSources.slice(0, 6).map((source) => (
                    <div key={`${source.sourceUrl}-${source.reportedAt}`} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="font-black hover:text-teal-700 dark:hover:text-teal-300">{source.sourceName}</a>
                        <span className="text-xs font-bold text-slate-500">{formatDate(source.reportedAt)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <CountBadge label="Confirmed" value={source.counts.confirmed} />
                        <CountBadge label="Presumptive" value={source.counts.presumptivePositive} />
                        <CountBadge label="Pending" value={source.counts.pendingConfirmation} />
                        <CountBadge label="Suspected" value={source.counts.suspected} />
                        <CountBadge label="Deaths" value={source.counts.deaths} />
                        <CountBadge label="Critical" value={source.counts.critical} />
                        <CountBadge label="Total" value={source.counts.totalReported} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{source.notes}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            {report.evidenceReports?.length ? (
              <section>
                <h3 className="font-black">Evidence Reports</h3>
                <div className="mt-3 space-y-2">
                  {report.evidenceReports.map((evidence) => (
                    <a key={evidence.reportId} href={evidence.sourceUrl} target="_blank" rel="noreferrer" className="block rounded-2xl border border-slate-200 p-3 text-sm transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
                      <strong>{evidence.title}</strong>
                      <p className="mt-1 text-xs text-slate-500">{evidence.sourceName} · {evidence.sourceType.replaceAll("_", " ")} · {formatDate(evidence.publishedAt)}</p>
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
            <EventCountTable reports={[report]} />
            <EvidencePanel reports={[report]} />
            {report.relatedLocations.length ? (
              <section>
                <h3 className="font-black">Related Locations</h3>
                <div className="mt-3 space-y-3">
                  {report.relatedLocations.map((location, index) => (
                    <div key={`${report.id}-related-${location.type}-${location.name}-${location.date}-${location.sourceUrl}-${index}`} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                      <div className="flex items-center justify-between gap-3">
                        <strong>{location.name}</strong>
                        <span className="text-xs font-bold text-slate-500">{formatDate(location.date)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{location.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <a href={report.sourceUrl} target="_blank" rel="noreferrer" className="btn-primary">
                Source <ExternalLink className="h-4 w-4" />
              </a>
              <Link href={`/reports/${report.id}`} className="btn-secondary">
                Full page
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
