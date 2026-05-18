import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

type LocationIndexRecord = {
  id: string;
  label: string;
  type: "city" | "county" | "state" | "zcta" | "global_city";
  city: string;
  county: string;
  state: string;
  stateCode: string;
  postalCode: string;
  country: "USA";
  latitude: number;
  longitude: number;
  population: number | null;
  aliases: string[];
};

const ROOT = process.cwd();
const SOURCE_DIR = join(ROOT, "data", "source", "us-census");
const OUTPUT_PATH = join(ROOT, "data", "location-index-us.json");
const CENSUS_BASE = "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer";
const DOWNLOADS = [
  ["places", "2024_Gaz_place_national.zip"],
  ["counties", "2024_Gaz_counties_national.zip"],
  ["zctas", "2024_Gaz_zcta_national.zip"]
] as const;

const STATES: Record<string, { name: string; lat: number; lon: number }> = {
  AL: { name: "Alabama", lat: 32.8067, lon: -86.7911 },
  AK: { name: "Alaska", lat: 61.3707, lon: -152.4044 },
  AZ: { name: "Arizona", lat: 33.7298, lon: -111.4312 },
  AR: { name: "Arkansas", lat: 34.9697, lon: -92.3731 },
  CA: { name: "California", lat: 36.1162, lon: -119.6816 },
  CO: { name: "Colorado", lat: 39.0598, lon: -105.3111 },
  CT: { name: "Connecticut", lat: 41.5978, lon: -72.7554 },
  DE: { name: "Delaware", lat: 39.3185, lon: -75.5071 },
  DC: { name: "District of Columbia", lat: 38.9072, lon: -77.0369 },
  FL: { name: "Florida", lat: 27.7663, lon: -81.6868 },
  GA: { name: "Georgia", lat: 33.0406, lon: -83.6431 },
  HI: { name: "Hawaii", lat: 21.0943, lon: -157.4983 },
  ID: { name: "Idaho", lat: 44.2405, lon: -114.4788 },
  IL: { name: "Illinois", lat: 40.3495, lon: -88.9861 },
  IN: { name: "Indiana", lat: 39.8494, lon: -86.2583 },
  IA: { name: "Iowa", lat: 42.0115, lon: -93.2105 },
  KS: { name: "Kansas", lat: 38.5266, lon: -96.7265 },
  KY: { name: "Kentucky", lat: 37.6681, lon: -84.6701 },
  LA: { name: "Louisiana", lat: 31.1695, lon: -91.8678 },
  ME: { name: "Maine", lat: 44.6939, lon: -69.3819 },
  MD: { name: "Maryland", lat: 39.0639, lon: -76.8021 },
  MA: { name: "Massachusetts", lat: 42.2302, lon: -71.5301 },
  MI: { name: "Michigan", lat: 43.3266, lon: -84.5361 },
  MN: { name: "Minnesota", lat: 45.6945, lon: -93.9002 },
  MS: { name: "Mississippi", lat: 32.7416, lon: -89.6787 },
  MO: { name: "Missouri", lat: 38.4561, lon: -92.2884 },
  MT: { name: "Montana", lat: 46.9219, lon: -110.4544 },
  NE: { name: "Nebraska", lat: 41.1254, lon: -98.2681 },
  NV: { name: "Nevada", lat: 38.3135, lon: -117.0554 },
  NH: { name: "New Hampshire", lat: 43.4525, lon: -71.5639 },
  NJ: { name: "New Jersey", lat: 40.2989, lon: -74.521 },
  NM: { name: "New Mexico", lat: 34.8405, lon: -106.2485 },
  NY: { name: "New York", lat: 42.1657, lon: -74.9481 },
  NC: { name: "North Carolina", lat: 35.6301, lon: -79.8064 },
  ND: { name: "North Dakota", lat: 47.5289, lon: -99.784 },
  OH: { name: "Ohio", lat: 40.3888, lon: -82.7649 },
  OK: { name: "Oklahoma", lat: 35.5653, lon: -96.9289 },
  OR: { name: "Oregon", lat: 44.572, lon: -122.0709 },
  PA: { name: "Pennsylvania", lat: 40.5908, lon: -77.2098 },
  RI: { name: "Rhode Island", lat: 41.6809, lon: -71.5118 },
  SC: { name: "South Carolina", lat: 33.8569, lon: -80.945 },
  SD: { name: "South Dakota", lat: 44.2998, lon: -99.4388 },
  TN: { name: "Tennessee", lat: 35.7478, lon: -86.6923 },
  TX: { name: "Texas", lat: 31.0545, lon: -97.5635 },
  UT: { name: "Utah", lat: 40.15, lon: -111.8624 },
  VT: { name: "Vermont", lat: 44.0459, lon: -72.7107 },
  VA: { name: "Virginia", lat: 37.7693, lon: -78.17 },
  WA: { name: "Washington", lat: 47.4009, lon: -121.4905 },
  WV: { name: "West Virginia", lat: 38.4912, lon: -80.9545 },
  WI: { name: "Wisconsin", lat: 44.2685, lon: -89.6165 },
  WY: { name: "Wyoming", lat: 42.756, lon: -107.3025 },
  PR: { name: "Puerto Rico", lat: 18.2208, lon: -66.5901 }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await mkdir(SOURCE_DIR, { recursive: true });
  if (process.argv.includes("--download")) {
    await downloadSources();
  }

  const records = [
    ...stateRecords(),
    ...parsePlaces(await readGazetteer("place")),
    ...parseCounties(await readGazetteer("counties")),
    ...parseZctas(await readGazetteer("zcta"))
  ];

  const unique = dedupe(records).sort(rankForIndex);
  await writeFile(OUTPUT_PATH, `${JSON.stringify(unique, null, 2)}\n`, "utf8");
  console.log(`Wrote ${unique.length} U.S. location records to ${OUTPUT_PATH}`);
}

async function downloadSources() {
  for (const [, file] of DOWNLOADS) {
    const target = join(SOURCE_DIR, file);
    if (existsSync(target)) continue;
    const response = await fetch(`${CENSUS_BASE}/${file}`);
    if (!response.ok) throw new Error(`Failed to download ${file}: ${response.status}`);
    await writeFile(target, Buffer.from(await response.arrayBuffer()));
  }
}

async function readGazetteer(kind: "place" | "counties" | "zcta") {
  const direct = [
    join(SOURCE_DIR, `2024_Gaz_${kind}_national.txt`),
    join(SOURCE_DIR, `2024_gaz_${kind}_national.txt`),
    join(SOURCE_DIR, `${kind}.txt`)
  ].find(existsSync);
  if (direct) return readFile(direct, "utf8");

  const zip = kind === "place" ? "2024_Gaz_place_national.zip" : kind === "counties" ? "2024_Gaz_counties_national.zip" : "2024_Gaz_zcta_national.zip";
  const zipPath = join(SOURCE_DIR, zip);
  if (!existsSync(zipPath)) return "";
  return execFileSync("unzip", ["-p", zipPath], { encoding: "utf8", maxBuffer: 100 * 1024 * 1024 });
}

function parsePlaces(text: string): LocationIndexRecord[] {
  return parseRows(text).map((row) => {
    const stateCode = row.USPS || "";
    const state = STATES[stateCode]?.name || stateCode;
    const city = titleCase(stripPlaceType(row.NAME || ""));
    return {
      id: `us-city-${stateCode.toLowerCase()}-${slug(city)}-${row.GEOID}`,
      label: `${city}, ${stateCode}, USA`,
      type: "city" as const,
      city,
      county: "",
      state,
      stateCode,
      postalCode: "",
      country: "USA" as const,
      latitude: Number(row.INTPTLAT),
      longitude: Number(row.INTPTLONG),
      population: null,
      aliases: [city, `${city} ${stateCode}`, `${city}, ${state}`, `${city}, ${stateCode}`]
    };
  }).filter(validRecord);
}

function parseCounties(text: string): LocationIndexRecord[] {
  return parseRows(text).map((row) => {
    const stateCode = row.USPS || "";
    const state = STATES[stateCode]?.name || stateCode;
    const county = titleCase(row.NAME || "");
    return {
      id: `us-county-${stateCode.toLowerCase()}-${slug(county)}-${row.GEOID}`,
      label: `${county}, ${stateCode}, USA`,
      type: "county" as const,
      city: "",
      county,
      state,
      stateCode,
      postalCode: "",
      country: "USA" as const,
      latitude: Number(row.INTPTLAT),
      longitude: Number(row.INTPTLONG),
      population: null,
      aliases: [county, `${county} ${stateCode}`, `${county}, ${state}`, `${county}, ${stateCode}`]
    };
  }).filter(validRecord);
}

function parseZctas(text: string): LocationIndexRecord[] {
  return parseRows(text).map((row) => {
    const postalCode = row.GEOID || row.ZCTA5 || "";
    return {
      id: `us-zcta-${postalCode}`,
      label: `${postalCode} ZCTA, USA`,
      type: "zcta" as const,
      city: "",
      county: "",
      state: "",
      stateCode: "",
      postalCode,
      country: "USA" as const,
      latitude: Number(row.INTPTLAT),
      longitude: Number(row.INTPTLONG),
      population: null,
      aliases: [postalCode, `zcta ${postalCode}`, `${postalCode} zip`]
    };
  }).filter(validRecord);
}

function stateRecords(): LocationIndexRecord[] {
  return Object.entries(STATES).map(([stateCode, state]) => ({
    id: `us-state-${stateCode.toLowerCase()}`,
    label: `${state.name}, USA`,
    type: "state" as const,
    city: "",
    county: "",
    state: state.name,
    stateCode,
    postalCode: "",
    country: "USA" as const,
    latitude: state.lat,
    longitude: state.lon,
    population: null,
    aliases: [stateCode, state.name, `${state.name} USA`]
  }));
}

function parseRows(text: string) {
  if (!text.trim()) return [];
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.trim().split(/\t|\s{2,}/).map((header) => header.trim());
  return lines.map((line) => {
    const values = line.trim().split(/\t|\s{2,}/);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

function dedupe(records: LocationIndexRecord[]) {
  const map = new Map<string, LocationIndexRecord>();
  for (const record of records) {
    const key = `${record.type}:${record.label.toLowerCase()}:${record.postalCode}`;
    if (!map.has(key)) map.set(key, record);
  }
  return Array.from(map.values());
}

function rankForIndex(a: LocationIndexRecord, b: LocationIndexRecord) {
  const order = { state: 0, city: 1, county: 2, zcta: 3, global_city: 4 };
  return order[a.type] - order[b.type] || a.label.localeCompare(b.label);
}

function validRecord(record: LocationIndexRecord) {
  return Number.isFinite(record.latitude) && Number.isFinite(record.longitude) && Boolean(record.label);
}

function stripPlaceType(value: string) {
  return value.replace(/\s+(city|town|village|borough|municipality|CDP)$/i, "");
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
