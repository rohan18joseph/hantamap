"use client";

import { useEffect, useMemo, useState } from "react";
import { Crosshair, Globe2, Search } from "lucide-react";
import { DashboardMap } from "@/components/dashboard-map";
import { ReportBadges } from "@/components/badges";
import { calculateBrief } from "@/lib/risk";
import type { HantamapReport, LocationRecord } from "@/lib/types";

type RiskLensProps = {
  reports: HantamapReport[];
  lastUpdated: string;
};

export function RiskLens({ reports, lastUpdated }: RiskLensProps) {
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 140);
  const [selected, setSelected] = useState<LocationRecord | undefined>();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mapboxMessage, setMapboxMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([import("@/data/location-index-us.json"), import("@/data/locations-global.json")])
      .then(([us, global]) => {
        if (cancelled) return;
        const merged = [...(us.default as LocationRecord[]), ...(global.default as LocationRecord[])];
        setLocations(merged);
        setSelected(merged.find((location) => location.id === "us-city-va-norfolk-5157000") || merged.find((location) => location.label === "Norfolk, VA, USA") || merged[0]);
      })
      .catch(() => setMapboxMessage("Location index could not load. Global fallback may still work if configured."))
      .finally(() => {
        if (!cancelled) setLoadingLocations(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const suggestions = useMemo(() => {
    return rankLocations(locations, debouncedQuery).slice(0, 10);
  }, [locations, debouncedQuery]);

  const brief = useMemo(() => {
    return selected ? calculateBrief(selected, reports, lastUpdated) : undefined;
  }, [selected, reports, lastUpdated]);

  function choose(location: LocationRecord) {
    setSelected(location);
    setQuery(location.label || location.name || "");
    setOpen(false);
    setMapboxMessage("");
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
      setOpen(true);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter" && open && suggestions[activeIndex]) {
      event.preventDefault();
      choose(suggestions[activeIndex]);
    }
    if (event.key === "Escape") setOpen(false);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setMapboxMessage("Browser geolocation is not available.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        choose({
          id: "browser-location",
          label: "Your browser location",
          city: "",
          county: "",
          state: "",
          stateCode: "",
          postalCode: "",
          country: "Detected locally",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          type: "global_city",
          population: null,
          aliases: []
        });
      },
      () => setMapboxMessage("Location permission was denied or unavailable.")
    );
  }

  async function searchGlobally() {
    const token = process.env.NEXT_PUBLIC_MAPBOX_GEOCODING_TOKEN;
    const value = query.trim();
    if (!value) return;
    if (!token) {
      setMapboxMessage("Optional Mapbox geocoding is disabled because NEXT_PUBLIC_MAPBOX_GEOCODING_TOKEN is not configured.");
      return;
    }

    const localGoodMatch = suggestions[0] && scoreLocation(suggestions[0], value) >= 900;
    if (localGoodMatch) {
      choose(suggestions[0]);
      return;
    }

    const cacheKey = `hantamap-mapbox-geocode:${value.toLowerCase()}`;
    const cached = window.localStorage.getItem(cacheKey);
    if (cached) {
      choose(JSON.parse(cached) as LocationRecord);
      setMapboxMessage("Loaded cached global geocoding result.");
      return;
    }

    setMapboxMessage("Searching global geocoder...");
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?limit=1&access_token=${encodeURIComponent(token)}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Mapbox returned ${response.status}`);
      const data = await response.json();
      const feature = data.features?.[0];
      if (!feature) {
        setMapboxMessage("No global geocoding result found.");
        return;
      }
      const [longitude, latitude] = feature.center;
      const record: LocationRecord = {
        id: `mapbox-${feature.id || slug(feature.place_name)}`,
        label: feature.place_name,
        city: feature.text || feature.place_name,
        county: "",
        state: "",
        stateCode: "",
        postalCode: "",
        country: feature.context?.find((item: { id: string }) => item.id.startsWith("country"))?.text || "Global",
        latitude,
        longitude,
        type: "global_city",
        population: null,
        aliases: [value, feature.place_name]
      };
      // Cache per-query in localStorage so repeated typing/clicks do not create runaway API usage.
      window.localStorage.setItem(cacheKey, JSON.stringify(record));
      choose(record);
      setMapboxMessage("Global geocoding result loaded and cached locally.");
    } catch (error) {
      setMapboxMessage(error instanceof Error ? error.message : "Global geocoding failed.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel p-5">
        <label className="text-sm font-black" htmlFor="location-search">
          ZIP/ZCTA, city, county, state, country, or major global location
        </label>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="location-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
                setActiveIndex(0);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="Try 23510, Norfolk VA, Bernalillo County, NM, Tenerife..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 font-bold outline-none ring-teal-600 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
            />
            {open ? (
              <div className="absolute z-[80] mt-2 max-h-96 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-soft dark:border-slate-800 dark:bg-slate-950">
                {loadingLocations ? (
                  <div className="space-y-2 p-2">
                    <div className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                    <div className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                  </div>
                ) : suggestions.length ? (
                  suggestions.map((location, index) => (
                    <button
                      key={location.id}
                      type="button"
                      onMouseDown={() => choose(location)}
                      className={`w-full rounded-xl px-3 py-3 text-left transition ${
                        index === activeIndex ? "bg-teal-50 text-teal-900 dark:bg-teal-950 dark:text-teal-100" : "hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                    >
                      <strong>{highlightMatch(location.label, debouncedQuery)}</strong>
                      <span className="ml-2 text-xs font-bold uppercase tracking-wide text-slate-500">{location.type}</span>
                      {location.population ? <span className="ml-2 text-xs text-slate-500">pop. {location.population.toLocaleString()}</span> : null}
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-sm text-slate-500">
                    <p>No strong local match. The static U.S. index supports Census places, counties, states, and ZCTAs when built.</p>
                    <button type="button" onMouseDown={searchGlobally} className="btn-primary mt-3">
                      Search globally
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <button type="button" onClick={useMyLocation} className="btn-secondary">
            <Crosshair className="h-4 w-4" /> Use my location
          </button>
          <button type="button" onClick={searchGlobally} className="btn-secondary">
            <Globe2 className="h-4 w-4" /> Search globally
          </button>
        </div>
        {mapboxMessage ? <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">{mapboxMessage}</p> : null}
        <p className="mt-3 text-xs text-slate-500">
          The local index includes U.S. Census locations plus a static global city and capital list. Optional Mapbox geocoding is only called when no local result is good enough or when you click Search globally. Results are cached in localStorage to avoid surprise costs. Showing 2026 reports only.
        </p>
      </section>

      {brief && selected ? (
        <>
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-6">
              <article className="panel p-6">
                <p className="kicker">Hantamap Brief</p>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-4xl font-black tracking-tight">{brief.status}</h2>
                    <p className="subtle mt-2">{brief.selectedLocation.label}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white dark:bg-white dark:text-slate-950">
                    <span className="text-xs font-black uppercase tracking-wider">Score</span>
                    <strong className="block text-2xl">{brief.score}/100</strong>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  This is a location-based public-health risk lens, not a medical diagnosis. General risk can remain low even when an official advisory exists, especially outside the specific exposure, travel, or close-contact context.
                  Reports are evidence, not case counts. Monitored or quarantined people are included as response indicators, not confirmed infections.
                  Screening does not mean confirmed infection, and presumptive positive may still be pending final confirmation.
                </p>
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  <BriefItem label="Nearest active verified report" value={brief.nearestActive ? `${Math.round(brief.nearestActive.distance)} mi - ${brief.nearestActive.title}` : "None within 250 miles"} />
                  <BriefItem label="Data confidence" value={brief.confidence} />
                  <BriefItem label="Official advisories" value={String(brief.officialAdvisories.length)} />
                  <BriefItem label="Person-to-person relevant nearby" value={String(brief.personToPersonEvents.length)} />
                  <BriefItem label="Death-associated nearby events" value={String(brief.deathAssociatedEvents.length)} />
                  <BriefItem label="Monitored / quarantined nearby" value={String(brief.affectingReports.filter((report) => (report.caseCounts.monitored || 0) > 0 || (report.caseCounts.quarantined || 0) > 0).length)} />
                  <BriefItem label="Historical baseline" value={`${brief.historicalBaseline.length} context record(s)`} />
                  <BriefItem label="Event clusters in radii" value={`${brief.counts[25]} / ${brief.counts[50]} / ${brief.counts[100]} / ${brief.counts[250]}`} />
                </dl>
              </article>

              <article className="panel p-6">
                <p className="kicker">Why This Score?</p>
                <div className="mt-4 space-y-4">
                  {brief.breakdown.map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between gap-4 text-sm font-black">
                        <span>{item.label}</span>
                        <span>{Math.round(item.value)}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full rounded-full bg-teal-600 dark:bg-teal-400" style={{ width: `${Math.min(100, (item.value / 24) * 100)}%` }} />
                      </div>
                      <p className="subtle mt-1 text-xs">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <DashboardMap reports={reports} selectedLocation={selected} heightClass="h-[62dvh] min-h-[430px] xl:h-[760px]" />
          </section>

          <section className="panel p-6">
            <p className="kicker">Reports Near This Location</p>
            <h2 className="mt-2 text-2xl font-black">Related event clusters</h2>
            <p className="subtle mt-2 text-sm">
              Hantamap clusters nearby evidence by eventId and nearest involved location, so multiple articles about one outbreak do not become multiple cases.
            </p>
            <div className="mt-5 grid gap-4 lg:grid-cols-4">
              {([25, 50, 100, 250] as const).map((radius) => (
                <div key={radius} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <h3 className="font-black">{radius} miles</h3>
                  <div className="mt-3 space-y-3">
                    {brief.groups[radius].length ? (
                      brief.groups[radius].map((report) => (
                        <div key={report.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                          <ReportBadges report={report} />
                          <p className="mt-2 text-sm font-black">{report.title}</p>
                          <a href={report.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-black text-teal-700 dark:text-teal-300">
                            Source link
                          </a>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No reports in this band.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="panel p-8">
          <div className="h-5 w-48 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="mt-4 h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </section>
      )}
    </div>
  );
}

function rankLocations(locations: LocationRecord[], query: string) {
  const value = normalize(query);
  if (!value) return locations.slice(0, 10);
  return locations
    .map((location) => ({ location, score: scoreLocation(location, value) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || (b.location.population || 0) - (a.location.population || 0) || a.location.label.localeCompare(b.location.label))
    .map((item) => item.location);
}

function scoreLocation(location: LocationRecord, rawQuery: string) {
  const query = normalize(rawQuery);
  const compact = query.replace(/\s/g, "");
  const label = normalize(location.label);
  const aliases = [
    location.label,
    location.city,
    location.county,
    location.state,
    location.stateCode,
    location.postalCode,
    location.region,
    location.country,
    location.countryCode,
    ...location.aliases
  ].filter(Boolean).map((value) => normalize(String(value)));
  const city = normalize(location.city || location.name || "");
  const country = normalize(location.country || "");
  const countryCode = normalize(location.countryCode || "");
  const region = normalize(location.region || location.state || "");
  const exactLocationTypes = new Set(["city", "global_city", "capital", "outbreak_location"]);
  const includesCounty = query.includes("county");
  if (location.type === "zcta" && location.postalCode === compact) return 1200;
  if (exactLocationTypes.has(location.type) && (label === query || aliases.includes(query))) return 1120 + locationPriority(location);
  if (city && (query === `${city} ${countryCode}` || query === `${city} ${country}` || query === `${city} ${region}` || query === `${city} ${region} ${country}`)) return 1110 + locationPriority(location);
  if (location.type === "state" && (normalize(location.state || "") === query || normalize(location.stateCode || "") === query)) return 1050;
  if (aliases.some((alias) => alias.startsWith(query)) || label.startsWith(query)) return 760 + locationPriority(location) - typePenalty(location, includesCounty);
  if (query.split(" ").every((part) => aliases.some((alias) => alias.includes(part)))) return 640 + locationPriority(location) - typePenalty(location, includesCounty);
  if (aliases.some((alias) => alias.includes(query)) || label.includes(query)) return 420 + locationPriority(location) - typePenalty(location, includesCounty);
  return 0;
}

function locationPriority(location: LocationRecord) {
  if (location.type === "outbreak_location") return 45;
  if (location.type === "capital") return 35;
  if ((location.population || 0) >= 5_000_000) return 20;
  return 0;
}

function typePenalty(location: LocationRecord, includesCounty: boolean) {
  if (location.type === "county" && !includesCounty) return 80;
  if (location.type === "zcta") return 20;
  return 0;
}

function highlightMatch(label: string, query: string) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return label;
  const index = label.toLowerCase().indexOf(cleanQuery.toLowerCase());
  if (index === -1) return label;
  return (
    <>
      {label.slice(0, index)}
      <mark className="rounded bg-amber-200 px-0.5 text-inherit dark:bg-amber-700">{label.slice(index, index + cleanQuery.length)}</mark>
      {label.slice(index + cleanQuery.length)}
    </>
  );
}

function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);
  return debounced;
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ");
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function BriefItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
      <dt className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm font-bold">{value}</dd>
    </div>
  );
}
