export default function MethodologyPage() {
  return (
    <main className="shell space-y-6 py-8">
      <section>
        <p className="kicker">Methodology</p>
        <h1 className="mt-3 text-5xl font-black tracking-tight">Methodology, Limits, and Source Policy</h1>
      </section>
      {[
        ["Data sources", "Hantamap treats WHO Disease Outbreak News, CDC HAN and hantavirus pages, ECDC outbreak and surveillance pages, CDC/NNDSS, HHS/ASPR, and national public-health agencies as official or national-agency evidence. State/local health departments and health systems can support monitoring, quarantine, and treatment locations. ProMED and professional bulletins are moderated context. Reuters, AP, The Guardian, BMJ/news pages, local news, and GDELT are supplemental or discovery."],
        ["Source confidence", "Official and national public-health agencies are high confidence. State and local public-health updates are high when they publish directly; hospital/health-system public updates are usually medium unless confirmed by public health. Supplemental news is low or medium depending on sourcing. Discovery results are unverified and remain candidates until reviewed."],
        ["Events vs evidence", "Hantamap separates disease events or case clusters, evidence reports/articles, locations involved in an event, and count snapshots from each source. Maps and dashboard counts are driven by canonical events, while reports provide source-backed evidence."],
        ["2026-only scope", "Hantamap v1 intentionally displays 2026 reports only. Older historical records may exist in archived data, but main maps, reports, counts, feeds, and the Hantamap Brief filter them out."],
        ["Confirmed vs supplemental", "Confirmed clusters and confirmed cases require official or high-confidence sources. Suspected, probable, supplemental, moderated, and discovery items are separated from confirmed records and should not be read as official case counts."],
        ["Count deduplication", "Reports about the same outbreak share an eventId. Dashboard official counts use the latest official or national agency count for that event instead of summing duplicate articles. Broader intelligence views can show local-health, health-system, and supplemental counts, but they are labeled separately."],
        ["Deaths and count snapshots", "Deaths, confirmed cases, suspected cases, probable cases, symptomatic illness, asymptomatic contacts, hospitalized patients, critical illness, quarantine, monitoring, recovery, and cleared-negative counts are tracked as separate fields. Every count is tied to a source snapshot."],
        ["Conflicting counts", "If sources report different confirmed, suspected, probable, symptomatic, asymptomatic, death, monitoring, quarantine, recovery, or cleared-negative counts, Hantamap keeps each count source visible instead of hiding the discrepancy."],
        ["Location-specific counts", "Event-wide counts describe the overall outbreak or cluster. Location counts describe only what happened at that location. Hantamap does not copy event-wide deaths to Emory, Nebraska, Raleigh, Victoria, Vancouver Island, Yukon, Madrid, Paris, Tenerife, Eindhoven, Nijmegen, Argentina, Rotterdam, or any other related marker unless a source explicitly attributes deaths to that location."],
        ["Screening and monitoring language", "Monitoring, quarantine, screening, pending confirmation, inconclusive testing, and presumptive positive results are tracked separately from confirmed infection. Monitoring does not mean infection. Screening does not mean confirmed infection. Presumptive positive may still be pending final confirmation."],
        ["Risk scoring", "The Hantamap Brief combines proximity to event-level people counts, official response/advisory signals, Andes virus/person-to-person relevance, severity, monitoring/quarantine as a response indicator, recency, regional baseline, and source confidence. Article count can improve evidence confidence, but it is not used as a case or risk baseline."],
        ["ZCTA and location limitations", "The U.S. location index uses Census Gazetteer places, counties, states, and ZIP Code Tabulation Areas. ZCTAs are Census approximations and are not exact USPS ZIP delivery routes. Locations may represent advisory regions, travel routes, case detection, or historical exposure sites rather than exact exposure coordinates."],
        ["Project and medical disclaimer", "This is an independent software project for data visualization and portfolio purposes. It is not affiliated with WHO, CDC, ECDC, or any health agency. It is not medical advice, not a government or public-health source, and not guaranteed real-time. Do not use it for medical, travel, or public-health decision-making; consult official public-health agencies and medical professionals."]
      ].map(([title, body]) => (
        <article key={title} className="panel p-6">
          <h2 className="text-2xl font-black">{title}</h2>
          <p className="subtle mt-3 leading-7">{body}</p>
        </article>
      ))}
    </main>
  );
}
