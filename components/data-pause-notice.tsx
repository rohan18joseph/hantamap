import reportsJson from "@/data/reports.json";
import { formatDate, formatRefreshTimeUtc } from "@/lib/geo";

const latestReportDate = reportsJson.reports.reduce(
  (latest, report) => report.publishedAt > latest ? report.publishedAt : latest,
  ""
);

export function DataPauseNotice() {
  return (
    <aside aria-label="Data update notice" className="border-b border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <div className="shell flex flex-col gap-1 py-3 text-sm sm:flex-row sm:gap-3">
        <strong className="shrink-0">Updates paused</strong>
        <p>
          Sources last checked {formatRefreshTimeUtc(reportsJson.lastUpdated)}; the newest included report is dated {formatDate(latestReportDate)}. This is a historical snapshot. Routine checks are paused, with no further updates planned unless public-health reporting changes and the project maintainer resumes them.
        </p>
      </div>
    </aside>
  );
}
