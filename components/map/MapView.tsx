"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import type { Map as MapboxMap, GeoJSONSource } from "mapbox-gl";
import type { Feature, FeatureCollection } from "geojson";
import { buildFog, subscribe } from "@/lib/fog";
import { onFix } from "@/lib/location";
import { CAMPUS_CENTER, LONDON_CENTER, MISSION_BUILDINGS, inCampus, type LngLat } from "@/lib/geo";
import { ATMOSPHERE, CAMPUS_PITCH, CAMPUS_ZOOM, CITY_PITCH, basemapConfig, londonLightPreset } from "@/lib/mapStyle";

export type MapHandle = {
  flyToCampus: () => void;
  flyToCity: () => void;
  center: () => LngLat | null;
  follow: (lngLat: LngLat) => void;
};

type Props = {
  ref?: Ref<MapHandle>;
  onReady: () => void;
  onUnavailable: (reason: string) => void;
};

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const dur = (ms: number) => (reducedMotion() ? 0 : ms);

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

function pointInRing([x, y]: LngLat, ring: LngLat[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Copy campus + mission building footprints out of the loaded streets tiles. */
function collectCampusBuildings(map: MapboxMap) {
  const campus = new Map<string, Feature>();
  const mission = new Map<string, Feature>();
  for (const f of map.querySourceFeatures("streets", { sourceLayer: "building" })) {
    const g = f.geometry;
    const first = (g.type === "Polygon" ? g.coordinates[0]?.[0] : g.type === "MultiPolygon" ? g.coordinates[0]?.[0]?.[0] : null) as
      | LngLat
      | null
      | undefined;
    if (!first || !inCampus(first)) continue;
    const key = `${f.id ?? ""}:${first[0].toFixed(6)},${first[1].toFixed(6)}`;
    const feature: Feature = { type: "Feature", properties: f.properties ?? {}, geometry: g };
    campus.set(key, feature);
    const rings = (g.type === "Polygon" ? [g.coordinates[0]] : g.type === "MultiPolygon" ? g.coordinates.map((p) => p[0]) : []) as LngLat[][];
    if (MISSION_BUILDINGS.some((b) => rings.some((r) => pointInRing(b.point, r)))) mission.set(key, feature);
  }
  (map.getSource("campus-buildings") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: [...campus.values()] });
  (map.getSource("mission-buildings") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: [...mission.values()] });
  return campus.size;
}

function addGameLayers(map: MapboxMap) {
  // --- Campus 3D buildings (Mustang City) -----------------------------------
  // `within` only matches points/lines, so campus footprints are copied out of the streets
  // tiles into GeoJSON sources (see collectCampusBuildings). This invisible layer makes the
  // building tiles load.
  map.addSource("streets", { type: "vector", url: "mapbox://mapbox.mapbox-streets-v8" });
  map.addLayer({
    id: "streets-building-loader",
    type: "fill",
    source: "streets",
    "source-layer": "building",
    minzoom: 13,
    paint: { "fill-opacity": 0 },
  });
  map.addSource("campus-buildings", { type: "geojson", data: EMPTY });
  map.addSource("mission-buildings", { type: "geojson", data: EMPTY });
  map.addLayer({
    id: "campus-buildings",
    type: "fill-extrusion",
    source: "campus-buildings",
    slot: "middle",
    minzoom: 14.5,
    paint: {
      "fill-extrusion-color": [
        "interpolate", ["linear"], ["coalesce", ["get", "height"], 10],
        0, "#7b2ff7",
        20, "#c13dd6",
        45, "#ff4f8b",
      ],
      "fill-extrusion-height": ["+", ["coalesce", ["get", "height"], 10], 1.5],
      "fill-extrusion-base": ["coalesce", ["get", "min_height"], 0],
      "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 14.5, 0, 15.5, 0.92],
      "fill-extrusion-vertical-gradient": true,
      "fill-extrusion-emissive-strength": 0.7,
    },
  });
  map.addLayer({
    id: "mission-buildings",
    type: "fill-extrusion",
    source: "mission-buildings",
    slot: "middle",
    minzoom: 14.5,
    paint: {
      "fill-extrusion-color": "#ffc857",
      "fill-extrusion-height": ["+", ["coalesce", ["get", "height"], 12], 3],
      "fill-extrusion-base": ["coalesce", ["get", "min_height"], 0],
      "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 14.5, 0, 15.5, 1],
      "fill-extrusion-emissive-strength": 1,
    },
  });

  // --- Fog of war -------------------------------------------------------------
  const { fog, edges } = buildFog();
  map.addSource("fog", { type: "geojson", data: fog });
  map.addSource("fog-edges", { type: "geojson", data: edges });
  map.addLayer({
    id: "fog-fill",
    type: "fill",
    source: "fog",
    slot: "top",
    paint: { "fill-color": "#000000", "fill-opacity": 1, "fill-emissive-strength": 1 },
  });
  map.addLayer({
    id: "fog-edge",
    type: "line",
    source: "fog-edges",
    slot: "top",
    layout: { "line-join": "round" },
    paint: {
      "line-color": "#000000",
      "line-opacity": 0.85,
      "line-width": ["interpolate", ["exponential", 2], ["zoom"], 11, 4, 16, 48],
      "line-blur": ["interpolate", ["exponential", 2], ["zoom"], 11, 4, 16, 48],
      "line-emissive-strength": 1,
    },
  });

  // --- Player -----------------------------------------------------------------
  map.addSource("player", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({
    id: "player-halo",
    type: "circle",
    source: "player",
    slot: "top",
    paint: {
      "circle-radius": 20,
      "circle-color": "#2ee6d6",
      "circle-opacity": 0.22,
      "circle-pitch-alignment": "map",
      "circle-emissive-strength": 1,
    },
  });
  map.addLayer({
    id: "player-dot",
    type: "circle",
    source: "player",
    slot: "top",
    paint: {
      "circle-radius": 7,
      "circle-color": "#2ee6d6",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
      "circle-pitch-alignment": "map",
      "circle-emissive-strength": 1,
    },
  });
}

export default function MapView({ ref, onReady, onUnavailable }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const callbacks = useRef({ onReady, onUnavailable });

  useEffect(() => {
    callbacks.current = { onReady, onUnavailable };
  });

  useImperativeHandle(ref, () => ({
    flyToCampus: () =>
      mapRef.current?.flyTo({ center: CAMPUS_CENTER, zoom: 16.2, pitch: CAMPUS_PITCH, bearing: -30, duration: dur(2200), essential: true }),
    flyToCity: () =>
      mapRef.current?.flyTo({ center: LONDON_CENTER, zoom: 12, pitch: CITY_PITCH, bearing: -15, duration: dur(2200), essential: true }),
    center: () => {
      const c = mapRef.current?.getCenter();
      return c ? [c.lng, c.lat] : null;
    },
    follow: (lngLat) => mapRef.current?.easeTo({ center: lngLat, duration: dur(400), essential: true }),
  }));

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      callbacks.current.onUnavailable("missing-token");
      return;
    }
    let cancelled = false;
    const cleanups: (() => void)[] = [];

    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled || !containerRef.current) return;
      if (!mapboxgl.supported?.() && "supported" in mapboxgl) {
        callbacks.current.onUnavailable("webgl");
        return;
      }
      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/standard",
        config: { basemap: basemapConfig(londonLightPreset()) },
        center: CAMPUS_CENTER,
        zoom: 13.4,
        pitch: CITY_PITCH,
        bearing: -20,
        maxPitch: 70,
        minZoom: 10,
        attributionControl: false,
      });
      mapRef.current = map;
      if (process.env.NODE_ENV !== "production") (window as unknown as { __mcMap: MapboxMap }).__mcMap = map;
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

      map.on("style.load", () => {
        map.setFog(ATMOSPHERE);
        addGameLayers(map);
      });
      map.once("idle", () => callbacks.current.onReady());

      // Refresh campus footprints as new building tiles arrive (debounced).
      let campusTimer: ReturnType<typeof setTimeout> | undefined;
      map.on("sourcedata", (e) => {
        if (e.sourceId !== "streets" || !e.isSourceLoaded) return;
        clearTimeout(campusTimer);
        campusTimer = setTimeout(() => collectCampusBuildings(map), 300);
      });
      map.on("error", (e) => {
        const status = (e.error as { status?: number } | undefined)?.status;
        if (status === 401 || status === 403) callbacks.current.onUnavailable("bad-token");
      });

      // Camera mode: city (45°) ↔ Mustang City (60°), switched only on mode change.
      let mode: "city" | "campus" = "city";
      map.on("moveend", () => {
        const c = map.getCenter();
        const next = map.getZoom() >= CAMPUS_ZOOM && inCampus([c.lng, c.lat]) ? "campus" : "city";
        if (next === mode) return;
        mode = next;
        map.easeTo({ pitch: next === "campus" ? CAMPUS_PITCH : CITY_PITCH, duration: dur(900), essential: true });
      });

      // Fog: rebuild only when cells change, debounced.
      let fogTimer: ReturnType<typeof setTimeout> | undefined;
      cleanups.push(
        subscribe(() => {
          clearTimeout(fogTimer);
          fogTimer = setTimeout(() => {
            if (!map.getSource("fog")) return;
            const { fog, edges } = buildFog();
            (map.getSource("fog") as GeoJSONSource).setData(fog);
            (map.getSource("fog-edges") as GeoJSONSource).setData(edges);
          }, 150);
        }),
      );

      cleanups.push(
        onFix(({ lngLat }) => {
          (map.getSource("player") as GeoJSONSource | undefined)?.setData({
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: lngLat },
          });
        }),
      );

      const ro = new ResizeObserver(() => map.resize());
      ro.observe(containerRef.current);
      cleanups.push(() => ro.disconnect());
    });

    return () => {
      cancelled = true;
      cleanups.forEach((c) => c());
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Mapbox sets `position: relative` on its container, so size it from an absolute wrapper.
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
