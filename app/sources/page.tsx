export default function SourcesPage() {
  return (
    <main className="shell space-y-6 py-8">
      <section>
        <p className="kicker">Sources</p>
        <h1 className="mt-3 text-5xl font-black tracking-tight">Source Policy and Trusted Tiers</h1>
      </section>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Tier title="Tier 1: Official" body="WHO, CDC, ECDC, Public Health Agency of Canada, RIVM, and other national or regional public-health agencies. ECDC is first-class official/high-confidence evidence and can drive verified report, advisory, monitoring, and official count views." />
        <Tier title="Tier 2: Local Health" body="State health departments, local health departments, and hospitals or health systems. These can support U.S. monitoring, quarantine, treatment, and local advisory records while staying distinct from federal official counts." />
        <Tier title="Tier 3: Moderated" body="ProMED and similar professional outbreak bulletins. These can inform monitoring and candidate review but should not override WHO, CDC, ECDC, or national agency counts." />
        <Tier title="Tier 4: Supplemental" body="Reuters, Associated Press, The Guardian, BMJ/news pages, and reputable local news. These are clearly marked supplemental unless corroborated by an official public-health source." />
        <Tier title="Tier 5: Discovery" body="GDELT DOC API results are discovery-only candidate records. They are useful for finding leads, but Hantamap does not publish them as confirmed reports automatically." />
      </div>
      <article className="panel p-6">
        <h2 className="text-2xl font-black">Static-first policy</h2>
        <p className="subtle mt-3 leading-7">
          Hantamap uses static JSON, GitHub Actions, Leaflet/OpenStreetMap, and free public pages. It does not require a paid geocoding API, database, AWS, Mapbox, or paid map tiles.
        </p>
      </article>
      <article className="panel p-6">
        <h2 className="text-2xl font-black">Independence and limitations</h2>
        <p className="subtle mt-3 leading-7">
          Hantamap is an independent portfolio/software project. It is not affiliated with any public-health agency, and source-linked records may be incomplete, delayed, or superseded. Always use official public-health sources for decisions.
        </p>
      </article>
    </main>
  );
}

function Tier({ title, body }: { title: string; body: string }) {
  return (
    <article className="panel p-6">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="subtle mt-3 leading-7">{body}</p>
    </article>
  );
}
