import { getReportFile } from "@/lib/data";
import { formatDateTime } from "@/lib/geo";

export async function Footer() {
  const { lastUpdated } = await getReportFile();

  return (
    <footer className="mt-12 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="shell grid gap-6 py-8 text-sm text-slate-600 dark:text-slate-400 md:grid-cols-[1.4fr_1fr_1fr]">
        <section>
          <h2 className="font-black text-slate-950 dark:text-slate-100">Project disclaimer</h2>
          <p className="mt-2 leading-6">
            This is an independent software project for data visualization and portfolio purposes. It is not affiliated with WHO, CDC, ECDC, or any health agency.
          </p>
        </section>
        <section>
          <h2 className="font-black text-slate-950 dark:text-slate-100">Data limitations</h2>
          <p className="mt-2 leading-6">
            Data may be incomplete, delayed, or incorrect. Supplemental reports can be unverified, and counts can differ between sources.
          </p>
        </section>
        <section>
          <h2 className="font-black text-slate-950 dark:text-slate-100">Not medical advice</h2>
          <p className="mt-2 leading-6">
            Do not use this project for medical, travel, or public-health decision-making. Consult official public-health agencies and medical professionals.
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">Last data refresh {formatDateTime(lastUpdated)}</p>
        </section>
      </div>
    </footer>
  );
}
