# Hantamap

Hantamap is an experimental web app that organizes 2026 hantavirus-related reports into an interactive map. It combines official public-health updates, health-system updates, local public-health statements, and supplemental news reports into event clusters so that reports can be understood by location, source, and event type.

This is not an official public-health tool. The data is best-effort, may be incomplete, and should not be used for medical, travel, or safety decisions.

## What This Project Is

Hantamap is a static, low-cost public-health data visualization prototype. It uses event-level records for maps and counts, and report-level records as evidence. The core idea is simple: articles are evidence, events are what get mapped, and people counts should not be double-counted just because several sources cover the same event.

The current v1 scope is limited to 2026 hantavirus and Andes-virus reporting.

## What This Project Is Not

Hantamap is not affiliated with WHO, CDC, ECDC, Public Health Agency of Canada, or any health agency. It is not a medical tool, a diagnostic tool, a public-health authority, or a guaranteed real-time surveillance system. It should not be used to make medical, travel, occupational, or public-health decisions.

## Why It Exists

Outbreak-related information often appears across official notices, health-system updates, local news, and wire reports. Those sources can refer to the same event, different locations in one event, or different count snapshots over time. Hantamap explores a practical way to organize that information without turning every article into a separate case.

## Current Limitations

Data collection is best-effort and source pages can change. Supplemental reports may be incomplete, delayed, or wrong. Counts can differ between sources. Some locations are approximate city, county, state, or country centroids rather than exact exposure locations. Static data refreshes are not guaranteed to capture every relevant update.

Monitoring, quarantine, screening, inconclusive testing, and presumptive positive results are kept separate from confirmed infection. Presumptive positive may still be pending final confirmation.

## Data and Source Methodology

Hantamap separates:

- Events: canonical disease events or response clusters that drive maps and counts.
- Reports: evidence records such as official updates, hospital notices, and articles.
- Locations: places involved in an event, such as treatment, monitoring, quarantine, travel route, exposure, or advisory locations.
- Count snapshots: source-specific people counts at a specific publication date.

Event-wide counts describe the overall outbreak or event. Location-level counts describe only what happened at that location. Global deaths or confirmed counts are not copied to related locations unless a source explicitly attributes those counts to that location.

## Source Confidence Tiers

Official and national public-health sources, including WHO, CDC, ECDC, Public Health Agency of Canada, RIVM, and similar agencies, are treated as high-confidence official evidence.

State and local health departments and hospital or health-system updates can support local monitoring, quarantine, treatment, and testing locations. Their confidence depends on the specificity of the source.

Moderated public-health reporting such as CIDRAP is used as expert evidence, but it does not override official agency counts.

Reuters, AP, The Guardian, NBC, local TV, newspapers, and other news sources are supplemental evidence unless corroborated by an official public-health source. Discovery sources, including GDELT, are treated as candidates for review.

## Risk Lens

The Risk Lens is an informational location-based model, not medical advice. It uses event-level people counts, proximity, severity, monitoring or quarantine response, official advisories, recency, source confidence, and a small regional baseline. Article count is not used as a case count or a risk baseline.

The Risk Lens does not diagnose infection risk and does not predict whether someone is likely to get hantavirus. Always consult medical professionals and official public-health agencies.

## Run Locally

```bash
npm install
npm run dev
```

The local app runs at `http://localhost:4173`.

## Refresh Data

```bash
npm run refresh:data
```

The refresh workflow updates static JSON and the daily digest when sources are reachable. Manual source overrides can be added in `data/manual-source-overrides.json` when a source needs careful count or location attribution.

## Validate and Build

```bash
npm run lint
npm run typecheck
npm run validate:data
npm run build
```

The validation step checks duplicate IDs, 2026 scope, location-level count attribution, Canada/U.S. MV Hondius modeling, and generated marker IDs.

## Deploy

The app is designed for the Vercel free tier. It uses static JSON, Next.js, TypeScript, Tailwind CSS, Leaflet, and OpenStreetMap tiles. No database, AWS service, Mapbox map rendering, or paid API is required.

Optional global geocoding can be enabled with:

```bash
NEXT_PUBLIC_MAPBOX_GEOCODING_TOKEN=
```

The app works without this token. It is only used when a user explicitly searches globally or when local static location autocomplete has no strong match.

## Legal, Medical, and Public-Health Disclaimer

This is an independent software project for data visualization and portfolio purposes. It is not affiliated with WHO, CDC, ECDC, Public Health Agency of Canada, or any health agency. The data may be incomplete, delayed, or incorrect. Do not use this project for medical, travel, or public-health decision-making. Always consult official public-health agencies and medical professionals.
