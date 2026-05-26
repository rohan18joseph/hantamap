"use client";

import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import * as L from "leaflet";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { LocateFixed, Network, RotateCcw, Route, ScrollText, ShieldAlert, Newspaper } from "lucide-react";
import { ReportDrawer } from "@/components/report-drawer";
import { primaryCount } from "@/lib/intelligence";
import { markerColor, statusLabel } from "@/lib/style";
import type { DashboardMapProps } from "@/components/dashboard-map";
import type { HantamapReport } from "@/lib/types";

const defaultCenter: [number, number] = [22, -18];
const activeStatuses = new Set(["confirmed_cluster", "confirmed_case", "active_advisory", "monitoring", "probable"]);

type MapHandle = L.Map | null;

export function HantamapMapClient({
  reports,
  selectedLocation,
  focusReportId,
  heightClass = "h-[62dvh] min-h-[430px] xl:h-[650px]",
  initialHistorical = true,
  resizeKey
}: DashboardMapProps) {
  const [map, setMap] = useState<MapHandle>(null);
  const [selectedReport, setSelectedReport] = useState<HantamapReport | undefined>();
  const [clusters, setClusters] = useState(true);
  const [paths, setPaths] = useState(true);
  const [historical, setHistorical] = useState(initialHistorical);
  const [advisories, setAdvisories] = useState(true);
  const [supplemental, setSupplemental] = useState(true);
  const [candidates, setCandidates] = useState(true);
  const [clusterHealthy, setClusterHealthy] = useState(true);
  const [legendOpen, setLegendOpen] = useState(false);

  const visibleReports = useMemo(
    () => reports.filter((report) => {
      if (!historical && report.status === "historical") return false;
      if (!advisories && (report.status === "active_advisory" || report.locationType === "advisory_region")) return false;
      if (!supplemental && report.sourceType === "supplemental_news") return false;
      if (!candidates && report.sourceType === "discovery") return false;
      return true;
    }),
    [advisories, candidates, historical, reports, supplemental]
  );

  useEffect(() => {
    const report = reports.find((item) => item.id === focusReportId);
    if (report && map) {
      map.flyTo([report.latitude, report.longitude], 6, { duration: 0.8 });
      setSelectedReport(report);
    }
  }, [focusReportId, map, reports]);

  function resetView() {
    map?.flyTo(defaultCenter, 3, { duration: 0.6 });
  }

  function fitVisible() {
    if (!map || !visibleReports.length) return;
    map.fitBounds(L.latLngBounds(visibleReports.map((report) => [report.latitude, report.longitude])).pad(0.25));
  }

  function fitActive() {
    if (!map) return;
    const active = reports.filter((report) => activeStatuses.has(report.status));
    if (!active.length) return;
    map.fitBounds(L.latLngBounds(active.map((report) => [report.latitude, report.longitude])).pad(0.25));
  }

  function zoomSelected() {
    if (selectedReport) map?.flyTo([selectedReport.latitude, selectedReport.longitude], 8, { duration: 0.8 });
  }

  const markers = visibleReports.map((report) => (
    <Marker
      key={report.id}
      position={[report.latitude, report.longitude]}
      icon={reportIcon(report, report.id === focusReportId)}
      eventHandlers={{ click: () => setSelectedReport(report) }}
    >
      <Tooltip direction="top" offset={[0, -18]} opacity={1} className="hantamap-tooltip">
        <div className="min-w-[250px] p-3">
          <strong>{report.title}</strong>
          <div className="mt-2 text-slate-500">{report.locationName}</div>
          <div className="mt-2 grid gap-1 text-xs">
            <span>Status: {statusLabel(report.status)}</span>
            <span>Virus: {report.virusType}</span>
            <span>Confirmed: {report.caseCounts.confirmed ?? "n/a"}</span>
            <span>Presumptive/pending: {report.caseCounts.presumptivePositive ?? "n/a"} / {report.caseCounts.pendingConfirmation ?? "n/a"}</span>
            <span>Probable/suspected: {report.caseCounts.probable ?? "n/a"} / {report.caseCounts.suspected ?? "n/a"}</span>
            <span>Screened/negative: {report.caseCounts.screened ?? "n/a"} / {report.caseCounts.negative ?? "n/a"}</span>
            <span>Deaths: {report.caseCounts.deaths ?? "n/a"}</span>
            <span>Source: {locationSourceNames(report)}</span>
            <span>Tier: {report.sourceType.replaceAll("_", " ")}</span>
            <span>Confidence: {report.confidence}</span>
            <span>Date: {report.reportDate}</span>
          </div>
        </div>
      </Tooltip>
    </Marker>
  ));

  const invalidateKey = [
    visibleReports.length,
    clusters,
    paths,
    historical,
    advisories,
    supplemental,
    candidates,
    Boolean(selectedReport),
    selectedLocation?.id,
    focusReportId,
    resizeKey
  ].join(":");

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-soft dark:border-slate-800 dark:bg-slate-900 ${heightClass}`}>
      <MapContainer
        center={defaultCenter}
        zoom={3}
        minZoom={2}
        scrollWheelZoom
        doubleClickZoom
        touchZoom
        zoomControl
        className="h-full w-full"
        ref={setMap}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
        />
        <MapController selectedLocation={selectedLocation} resizeKey={invalidateKey} />
        {paths ? <EventPaths reports={visibleReports} /> : null}
        {selectedLocation ? (
          <CircleMarker
            center={[selectedLocation.latitude, selectedLocation.longitude]}
            radius={10}
            pathOptions={{ color: "#0f766e", fillColor: "#14b8a6", fillOpacity: 0.9, weight: 3 }}
          >
            <Tooltip>
              <strong>{selectedLocation.label || selectedLocation.name}</strong>
              <br />
              Selected location
            </Tooltip>
          </CircleMarker>
        ) : null}
        {clusters && clusterHealthy && MarkerClusterGroup ? (
          <ClusterFallbackBoundary onFail={() => setClusterHealthy(false)} fallback={markers}>
            <MarkerClusterGroup
              chunkedLoading
              iconCreateFunction={(cluster: { getChildCount: () => number }) =>
                L.divIcon({
                  html: `<span>${cluster.getChildCount()}</span>`,
                  className: "hantamap-cluster",
                  iconSize: [42, 42]
                })
              }
              spiderfyOnMaxZoom
              showCoverageOnHover={false}
            >
              {markers}
            </MarkerClusterGroup>
          </ClusterFallbackBoundary>
        ) : (
          markers
        )}
      </MapContainer>
      <div className="absolute left-3 right-3 top-3 z-[500] flex max-h-28 gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-soft dark:border-slate-700 dark:bg-slate-950 sm:left-4 sm:right-auto sm:top-4 sm:max-h-none sm:max-w-[calc(100%-2rem)] sm:flex-wrap sm:overflow-visible">
        <button className="btn-secondary" type="button" onClick={resetView}>
          <RotateCcw className="h-4 w-4" /> Reset world view
        </button>
        <button className="btn-secondary" type="button" onClick={fitVisible}>
          <LocateFixed className="h-4 w-4" /> Fit visible
        </button>
        <button className="btn-secondary" type="button" onClick={fitActive}>
          <LocateFixed className="h-4 w-4" /> Fit active
        </button>
        <button className="btn-secondary" type="button" onClick={zoomSelected} disabled={!selectedReport}>
          <LocateFixed className="h-4 w-4" /> Zoom selected
        </button>
        <button className="btn-secondary" type="button" onClick={() => setClusters((value) => !value)}>
          <Network className="h-4 w-4" /> {clusters ? "Clusters on" : "Clusters off"}
        </button>
        <button className="btn-secondary" type="button" onClick={() => setPaths((value) => !value)}>
          <Route className="h-4 w-4" /> Paths
        </button>
        <button className="btn-secondary" type="button" onClick={() => setHistorical((value) => !value)}>
          <ScrollText className="h-4 w-4" /> Historical
        </button>
        <button className="btn-secondary" type="button" onClick={() => setAdvisories((value) => !value)}>
          <ShieldAlert className="h-4 w-4" /> Advisories
        </button>
        <button className="btn-secondary" type="button" onClick={() => setSupplemental((value) => !value)}>
          <Newspaper className="h-4 w-4" /> Supplemental
        </button>
        <button className="btn-secondary" type="button" onClick={() => setCandidates((value) => !value)}>
          <Network className="h-4 w-4" /> Candidates
        </button>
      </div>
      <button
        type="button"
        onClick={fitVisible}
        className="btn-primary absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-3 z-[520] px-3 shadow-soft sm:hidden"
      >
        <LocateFixed className="h-4 w-4" /> Fit
      </button>
      {!clusterHealthy ? (
        <div className="absolute right-4 top-4 z-[500] rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-900 shadow-soft dark:bg-amber-950 dark:text-amber-100">
          Cluster layer unavailable; showing standard markers.
        </div>
      ) : null}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-3 z-[500] max-w-[min(19rem,calc(100%-6rem))] rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 shadow-soft dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 sm:bottom-4 sm:left-4 sm:max-w-none">
        <button
          type="button"
          onClick={() => setLegendOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:pointer-events-none"
        >
          Map legend <span className="sm:hidden">{legendOpen ? "Hide" : "Show"}</span>
        </button>
        <div className={`${legendOpen ? "mt-2 block" : "hidden"} sm:mt-2 sm:block`}>
          <LegendItem color="bg-red-600" label="Confirmed cluster/case" />
          <LegendItem color="bg-amber-600" label="Active advisory" />
          <LegendItem color="bg-blue-600" label="Monitoring" />
          <LegendItem color="bg-slate-600" label="Supplemental" />
          <LegendItem color="bg-slate-900 dark:bg-slate-100" label="Death-associated badge" />
        </div>
      </div>
      <ReportDrawer report={selectedReport} onClose={() => setSelectedReport(undefined)} />
    </div>
  );
}

class ClusterFallbackBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onFail: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFail();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function MapController({ selectedLocation, resizeKey }: Pick<DashboardMapProps, "selectedLocation"> & { resizeKey: string }) {
  const map = useMap();
  useEffect(() => {
    if (selectedLocation) {
      map.flyTo([selectedLocation.latitude, selectedLocation.longitude], 6, { duration: 0.8 });
    }
  }, [map, selectedLocation]);

  useLeafletInvalidateSize(map, resizeKey);

  return null;
}

function useLeafletInvalidateSize(map: L.Map, resizeKey: string) {
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const invalidate = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => map.invalidateSize({ animate: true }), 120);
    };

    invalidate();
    window.addEventListener("resize", invalidate);
    window.addEventListener("orientationchange", invalidate);
    window.visualViewport?.addEventListener("resize", invalidate);

    return () => {
      if (timeout) clearTimeout(timeout);
      window.removeEventListener("resize", invalidate);
      window.removeEventListener("orientationchange", invalidate);
      window.visualViewport?.removeEventListener("resize", invalidate);
    };
  }, [map, resizeKey]);
}

function EventPaths({ reports }: { reports: HantamapReport[] }) {
  return (
    <>
      {reports.map((report) => {
        const points = [
          ...report.relatedLocations.map((location) => [location.latitude, location.longitude] as [number, number]),
          [report.latitude, report.longitude] as [number, number]
        ];
        if (points.length <= 1) return null;
        return (
          <Polyline
            key={`${report.id}-path`}
            positions={points}
            pathOptions={{ color: markerColor(report.status), weight: 2, opacity: 0.62, dashArray: "6 8" }}
          />
        );
      })}
    </>
  );
}

function reportIcon(report: HantamapReport, active = false) {
  const count = primaryCount(report);
  const deaths = report.caseCounts.deaths;
  const monitored = (report.caseCounts.monitored || 0) + (report.caseCounts.quarantined || 0);
  const size = active ? 48 : count && count >= 10 ? 44 : 40;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span style="background:${markerColor(report.status)}" class="hantamap-marker ${deaths ? "hantamap-marker-deaths" : ""} ${monitored ? "hantamap-marker-monitoring" : ""} ${active ? "hantamap-marker-active" : ""}">${markerInitial(report)}${deaths ? `<b>D${deaths}</b>` : monitored ? `<b>M${monitored}</b>` : count ? `<b>${count}</b>` : ""}</span>`
  });
}

function markerInitial(report: HantamapReport) {
  if (report.status === "confirmed_cluster" || report.status === "confirmed_case") return "C";
  if (report.status === "active_advisory") return "A";
  if (report.status === "supplemental_update") return "S";
  if (report.status === "historical") return "H";
  return "M";
}

function locationSourceNames(report: HantamapReport) {
  const names = report.evidenceReports?.map((evidence) => evidence.sourceName).filter(Boolean) || [];
  return Array.from(new Set(names)).slice(0, 3).join(", ") || report.sourceName;
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="mt-1 flex items-center gap-2 first:mt-0">
      <span className={`h-3 w-3 rounded-full ${color}`} /> {label}
    </div>
  );
}
