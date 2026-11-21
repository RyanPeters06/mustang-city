"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import type { Map as MapboxMap, GeoJSONSource } from "mapbox-gl";
import type { Feature, FeatureCollection } from "geojson";
import { buildFog, isRevealedAt, subscribe } from "@/lib/fog";
import { REVEAL_ACCURACY_M, getLastFix, onFix, type Fix } from "@/lib/location";
import {
  CAMPUS_BUILDINGS,
  CAMPUS_CENTER,
  LONDON_BOUNDARY,
  LONDON_CENTER,
  MAX_BOUNDS,
  MISSION_BUILDINGS,
  SEA_RING,
  inCampus,
  ringIsCounterClockwise,
  type LngLat,
} from "@/lib/geo";
import { ATMOSPHERE, CAMPUS_PITCH, CAMPUS_ZOOM, CITY_PITCH, basemapConfig, londonLightPreset } from "@/lib/mapStyle";

export type MapHandle = {
  flyToCampus: () => void;
  flyToCity: () => void;
  center: () => LngLat | null;
  follow: (lngLat: LngLat) => void;
  locate: (lngLat: LngLat) => void;
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

  // --- Island: open sea around Forest State, glowing coastline + surf rings ----------
  map.addSource("sea", {
    type: "geojson",
    data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [SEA_RING, LONDON_BOUNDARY] } },
  });
  map.addSource("coast", {
    type: "geojson",
    data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: LONDON_BOUNDARY } },
  });
  map.addLayer({
    id: "sea",
    type: "fill",
    source: "sea",
    slot: "top",
    paint: { "fill-color": "#1b0d45", "fill-emissive-strength": 1 },
  });
  // line-offset is relative to line direction; flip so surf always sits out at sea.
  const out = ringIsCounterClockwise(LONDON_BOUNDARY) ? 1 : -1;
  for (const [i, offset] of [14, 30, 50].entries()) {
    map.addLayer({
      id: `surf-${i}`,
      type: "line",
      source: "coast",
      slot: "top",
      layout: { "line-join": "round" },
      paint: {
        "line-color": "#2ee6d6",
        "line-width": 1.2,
        "line-opacity": 0.35 - i * 0.1,
        "line-offset": out * offset,
        "line-emissive-strength": 1,
      },
    });
  }
  map.addLayer({
    id: "coast-glow",
    type: "line",
    source: "coast",
    slot: "top",
    layout: { "line-join": "round" },
    paint: {
      "line-color": "#ff4f8b",
      "line-width": 18,
      "line-blur": 16,
      "line-opacity": 0.55,
      "line-emissive-strength": 1,
    },
  });
  map.addLayer({
    id: "coast-line",
    type: "line",
    source: "coast",
    slot: "top",
    layout: { "line-join": "round" },
    paint: { "line-color": "#ffd1e3", "line-width": 1.5, "line-emissive-strength": 1 },
  });

  // --- Island + campus names at overview zoom ------------------------------------
  map.addSource("island-names", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { name: "FOREST STATE", size: 1 }, geometry: { type: "Point", coordinates: LONDON_CENTER } },
        { type: "Feature", properties: { name: "MUSTANG CITY", size: 0.6 }, geometry: { type: "Point", coordinates: CAMPUS_CENTER } },
      ],
    },
  });
  map.addLayer({
    id: "island-names",
    type: "symbol",
    source: "island-names",
    slot: "top",
    maxzoom: 14.5,
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
      "text-size": ["*", ["get", "size"], ["interpolate", ["linear"], ["zoom"], 9.5, 20, 13, 30]],
      "text-letter-spacing": 0.25,
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": ["case", ["==", ["get", "name"], "FOREST STATE"], "#ff4f8b", "#ffc857"],
      "text-halo-color": "#140a2e",
      "text-halo-width": 2,
      "text-halo-blur": 1,
      "text-opacity": ["interpolate", ["linear"], ["zoom"], 13.5, 1, 14.5, 0],
      "text-emissive-strength": 1,
    },
  });

  // --- Campus building names (dimmed while still under fog) ----------------------
  map.addSource("campus-labels", { type: "geojson", data: campusLabelData() });
  map.addLayer({
    id: "campus-labels",
    type: "symbol",
    source: "campus-labels",
    slot: "top",
    minzoom: 15,
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 15, 10, 18, 15],
      "text-transform": "uppercase",
      "text-letter-spacing": 0.06,
      "text-max-width": 8,
      "text-padding": 4,
      "symbol-z-elevate": true,
      "symbol-sort-key": ["case", ["get", "revealed"], 0, 1],
    },
    paint: {
      "text-color": ["case", ["get", "revealed"], "#fff1c9", "rgba(246,239,255,0.4)"],
      "text-halo-color": "#140a2e",
      "text-halo-width": 1.6,
      "text-emissive-strength": 1,
    },
  });

  // --- Player marker: accuracy circle, pulse, arrow (heading known) or dot ----------
  map.addImage("player-pulse", pulsingRing(map), { pixelRatio: 2 });
  map.addImage("player-arrow", arrowImage(), { pixelRatio: 2 });
  map.addImage("player-dot", dotImage(), { pixelRatio: 2 });
  map.addSource("player", { type: "geojson", data: EMPTY });
  map.addLayer({
    id: "player-accuracy",
    type: "circle",
    source: "player",
    slot: "top",
    paint: {
      // metres → pixels at London's latitude (512-px tiles): px = m * 2^z / 57245
      "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 0, 0, 22, ["*", ["get", "accuracy"], 73.27]],
      "circle-color": "#2ee6d6",
      "circle-opacity": 0.1,
      "circle-stroke-color": "#2ee6d6",
      "circle-stroke-opacity": 0.45,
      "circle-stroke-width": 1,
      "circle-pitch-alignment": "map",
      "circle-emissive-strength": 1,
    },
  });
  map.addLayer({
    id: "player-pulse",
    type: "symbol",
    source: "player",
    slot: "top",
    layout: {
      "icon-image": "player-pulse",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "icon-pitch-alignment": "map",
    },
    paint: { "icon-opacity": ["case", ["get", "weak"], 0.4, 1] },
  });
  map.addLayer({
    id: "player-marker",
    type: "symbol",
    source: "player",
    slot: "top",
    layout: {
      "icon-image": ["case", ["get", "hasHeading"], "player-arrow", "player-dot"],
      "icon-rotate": ["get", "heading"],
      "icon-rotation-alignment": "map",
      "icon-pitch-alignment": "map",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
    paint: { "icon-opacity": ["case", ["get", "weak"], 0.6, 1] },
  });

  const last = getLastFix();
  if (last) setPlayer(map, last);
}

function setPlayer(map: MapboxMap, { lngLat, heading, accuracy }: Fix) {
  (map.getSource("player") as GeoJSONSource | undefined)?.setData({
    type: "Feature",
    properties: {
      heading: heading ?? 0,
      hasHeading: heading !== null,
      accuracy,
      weak: accuracy > REVEAL_ACCURACY_M, // too rough to clear fog: marker dims
    },
    geometry: { type: "Point", coordinates: lngLat },
  });
}

/** Teal dot with white rim (heading unknown). */
function dotImage() {
  const size = 48;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.shadowColor = "rgba(46,230,214,0.9)";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 11, 0, Math.PI * 2);
  ctx.fillStyle = "#2ee6d6";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  return ctx.getImageData(0, 0, size, size);
}

function campusLabelData(): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: CAMPUS_BUILDINGS.map((b) => ({
      type: "Feature",
      properties: { name: b.name, revealed: isRevealedAt(b.lat, b.lng) },
      geometry: { type: "Point", coordinates: [b.lng, b.lat] },
    })),
  };
}

/** Teal navigation arrow (64×64 @2x), pointing north before rotation. */
function arrowImage() {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.translate(size / 2, size / 2);
  ctx.shadowColor = "rgba(46,230,214,0.9)";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(16, 18);
  ctx.lineTo(0, 9);
  ctx.lineTo(-16, 18);
  ctx.closePath();
  ctx.fillStyle = "#2ee6d6";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffffff";
  ctx.lineJoin = "round";
  ctx.stroke();
  return ctx.getImageData(0, 0, size, size);
}

/** Animated expanding teal ring (Mapbox StyleImageInterface). */
function pulsingRing(map: MapboxMap) {
  const size = 160;
  const reduced = reducedMotion();
  let ctx: CanvasRenderingContext2D | null = null;
  return {
    width: size,
    height: size,
    data: new Uint8ClampedArray(size * size * 4),
    onAdd() {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      ctx = c.getContext("2d", { willReadFrequently: true });
    },
    render() {
      if (!ctx) return false;
      const t = reduced ? 0.35 : (performance.now() % 1600) / 1600;
      ctx.clearRect(0, 0, size, size);
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 18 + t * 56, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(46,230,214,${0.35 * (1 - t)})`;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(46,230,214,${0.8 * (1 - t)})`;
      ctx.stroke();
      this.data = ctx.getImageData(0, 0, size, size).data;
      if (!reduced) map.triggerRepaint();
      return true;
    },
  };
}

export default function MapView({ ref, onReady, onUnavailable }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const followRef = useRef(false);
  const callbacks = useRef({ onReady, onUnavailable });

  useEffect(() => {
    callbacks.current = { onReady, onUnavailable };
  });

  useImperativeHandle(ref, () => ({
    flyToCampus: () =>
      mapRef.current?.flyTo({ center: CAMPUS_CENTER, zoom: 16.2, pitch: CAMPUS_PITCH, bearing: -30, duration: dur(2200), essential: true }),
    flyToCity: () =>
      mapRef.current?.flyTo({ center: LONDON_CENTER, zoom: 9.85, pitch: 25, bearing: 0, duration: dur(2200), essential: true }),
    center: () => {
      const c = mapRef.current?.getCenter();
      return c ? [c.lng, c.lat] : null;
    },
    follow: (lngLat) => mapRef.current?.easeTo({ center: lngLat, duration: dur(400), essential: true }),
    locate: (lngLat) => {
      followRef.current = true;
      mapRef.current?.flyTo({ center: lngLat, zoom: Math.max(mapRef.current.getZoom(), 16), duration: dur(1400), essential: true });
    },
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
        minZoom: 9.4,
        maxBounds: MAX_BOUNDS,
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
            (map.getSource("campus-labels") as GeoJSONSource).setData(campusLabelData());
          }, 80);
        }),
      );

      // Player: move the marker; follow the player until they pan the map themselves.
      map.on("dragstart", () => {
        followRef.current = false;
      });
      let lastFollow = 0;
      cleanups.push(
        onFix((fix, first) => {
          setPlayer(map, fix);
          if (first) {
            followRef.current = true;
            map.flyTo({ center: fix.lngLat, zoom: Math.max(map.getZoom(), 16), duration: dur(1600), essential: true });
            lastFollow = performance.now();
          } else if (followRef.current && performance.now() - lastFollow > 450) {
            lastFollow = performance.now();
            map.easeTo({ center: fix.lngLat, duration: dur(450), essential: true });
          }
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
