"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import type { Map as MapboxMap, GeoJSONSource } from "mapbox-gl";
import type { Feature, FeatureCollection, LineString, MultiPolygon, Polygon } from "geojson";
import { cellsToMultiPolygon } from "h3-js";
import { MISSIONS, approxCenter, missionBySlug, type Mission } from "@/lib/missions";
import { getSnapshot as getProgress, subscribe as subscribeProgress } from "@/lib/progress";
import { DISTRICTS } from "@/lib/districts";
import { buildFog, isRevealedAt, subscribe } from "@/lib/fog";
import { REVEAL_ACCURACY_M, getLastFix, onFix, type Fix } from "@/lib/location";
import { getTags, subscribeTags } from "@/lib/tags";
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
  distanceM,
  type LngLat,
} from "@/lib/geo";
import { ATMOSPHERE, CAMPUS_PITCH, CAMPUS_ZOOM, CITY_PITCH, basemapConfig, currentLightPreset, subscribeLight } from "@/lib/mapStyle";

export type MapHandle = {
  flyToCampus: () => void;
  flyToCity: () => void;
  center: () => LngLat | null;
  follow: (lngLat: LngLat) => void;
  locate: (lngLat: LngLat) => void;
  /** Fly to a mission, leaving room for the bottom sheet. */
  showMission: (slug: string) => void;
  /** Draw (or clear with null) the glowing waypoint route. */
  setRoute: (route: LineString | null) => void;
  /** Tint a friend's explored cells (null clears) and frame them. */
  showFriendArea: (cells: string[] | null, color?: string) => void;
  /** Remove the tapped-building highlight. */
  clearBuilding: () => void;
};

type Props = {
  ref?: Ref<MapHandle>;
  onReady: () => void;
  onUnavailable: (reason: string) => void;
  onMissionTap: (slug: string) => void;
  onBuildingTap: (b: BuildingTap) => void;
  onTagTap: (id: string) => void;
};

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const dur = (ms: number) => (reducedMotion() ? 0 : ms);
const NO_PAD = { top: 0, bottom: 0, left: 0, right: 0 };

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

  // --- Selected campus building (tap) ---------------------------------------------
  map.addSource("building-selected", { type: "geojson", data: EMPTY });
  map.addLayer({
    id: "building-selected",
    type: "fill-extrusion",
    source: "building-selected",
    slot: "middle",
    paint: {
      "fill-extrusion-color": "#2ee6d6",
      "fill-extrusion-height": ["+", ["coalesce", ["get", "height"], 12], 4],
      "fill-extrusion-base": ["coalesce", ["get", "min_height"], 0],
      "fill-extrusion-opacity": 0.95,
      "fill-extrusion-emissive-strength": 1,
    },
  });

  // --- A friend's explored area, tinted in their accent (above the fog) ------------
  map.addSource("friend-area", { type: "geojson", data: EMPTY });
  map.addLayer({
    id: "friend-area-fill",
    type: "fill",
    source: "friend-area",
    slot: "top",
    paint: { "fill-color": "#2ee6d6", "fill-opacity": 0.32, "fill-emissive-strength": 1 },
  });
  map.addLayer({
    id: "friend-area-line",
    type: "line",
    source: "friend-area",
    slot: "top",
    paint: { "line-color": "#2ee6d6", "line-width": 1.5, "line-opacity": 0.9, "line-emissive-strength": 1 },
  });

  // --- Neighbourhoods (City of London planning districts): outlines + names ---------
  map.addSource("districts", { type: "geojson", data: districtShapes() });
  map.addSource("district-labels", { type: "geojson", data: districtLabels() });
  map.addLayer({
    id: "district-lines",
    type: "line",
    source: "districts",
    slot: "top",
    minzoom: 10,
    maxzoom: 15,
    paint: {
      "line-color": ["case", ["get", "unlocked"], "#ffc857", "#f6efff"],
      "line-opacity": ["case", ["get", "unlocked"], 0.55, 0.14],
      "line-width": 1,
      "line-dasharray": [3, 2],
      "line-emissive-strength": 1,
    },
  });
  map.addLayer({
    id: "district-labels",
    type: "symbol",
    source: "district-labels",
    slot: "top",
    minzoom: 10.6,
    maxzoom: 14,
    layout: {
      "text-field": ["upcase", ["get", "name"]],
      "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 10.6, 10, 13, 15],
      "text-letter-spacing": 0.22,
      "text-max-width": 7,
      "text-padding": 6,
    },
    paint: {
      "text-color": ["case", ["get", "unlocked"], "#ffc857", "rgba(246,239,255,0.5)"],
      "text-halo-color": "#140a2e",
      "text-halo-width": 1.6,
      "text-emissive-strength": 1,
    },
  });

  // --- Waypoint route (under blips and player) -----------------------------------
  map.addSource("route", { type: "geojson", data: EMPTY });
  map.addLayer({
    id: "route-glow",
    type: "line",
    source: "route",
    slot: "top",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": "#ff4f8b", "line-width": 14, "line-blur": 10, "line-opacity": 0.7, "line-emissive-strength": 1 },
  });
  map.addLayer({
    id: "route-core",
    type: "line",
    source: "route",
    slot: "top",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": "#ffc857", "line-width": 4, "line-emissive-strength": 1 },
  });

  // --- Missions: blips, and approximate area rings while a landmark is fogged ------
  for (const [id, color, glyph] of MISSION_ICONS) map.addImage(id, missionIcon(color, glyph), { pixelRatio: 2 });
  const { points, areas } = missionData();
  map.addSource("mission-areas", { type: "geojson", data: areas });
  map.addSource("missions", { type: "geojson", data: points });
  map.addLayer({
    id: "mission-areas-fill",
    type: "fill",
    source: "mission-areas",
    slot: "top",
    paint: { "fill-color": "#ffc857", "fill-opacity": 0.12, "fill-emissive-strength": 1 },
  });
  map.addLayer({
    id: "mission-areas-line",
    type: "line",
    source: "mission-areas",
    slot: "top",
    paint: { "line-color": "#ffc857", "line-width": 1.5, "line-dasharray": [2, 2], "line-opacity": 0.8, "line-emissive-strength": 1 },
  });
  map.addLayer({
    id: "mission-area-labels",
    type: "symbol",
    source: "mission-areas",
    slot: "top",
    minzoom: 12.5,
    layout: {
      "text-field": "?",
      "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
      "text-size": 18,
      "text-allow-overlap": true,
    },
    paint: { "text-color": "#ffc857", "text-halo-color": "#140a2e", "text-halo-width": 2, "text-emissive-strength": 1 },
  });
  map.addLayer({
    id: "mission-blips",
    type: "symbol",
    source: "missions",
    slot: "top",
    layout: {
      "icon-image": ["get", "icon"],
      "icon-size": ["interpolate", ["linear"], ["zoom"], 11, 0.7, 16, 1],
      "icon-allow-overlap": true,
      "symbol-sort-key": ["case", ["get", "done"], 1, 0],
      "text-field": ["step", ["zoom"], "", 15.5, ["get", "title"]],
      "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
      "text-size": 11,
      "text-offset": [0, 1.7],
      "text-anchor": "top",
      "text-optional": true,
      "text-max-width": 9,
    },
    paint: {
      "icon-opacity": ["case", ["get", "done"], 0.45, 1],
      "text-color": "#ffffff",
      "text-halo-color": "#140a2e",
      "text-halo-width": 1.6,
      "text-emissive-strength": 1,
      "icon-emissive-strength": 1,
    },
  });

  // --- Geo-pinned tags: only ones the player may see (store already gates on revealed cells) ---
  map.addImage("tag-pin", missionIcon("#f6efff", TAG_GLYPH), { pixelRatio: 2 });
  map.addSource("tags", { type: "geojson", data: tagData() });
  map.addLayer({
    id: "tag-pins",
    type: "symbol",
    source: "tags",
    slot: "top",
    minzoom: 13,
    layout: {
      "icon-image": "tag-pin",
      "icon-size": ["interpolate", ["linear"], ["zoom"], 13, 0.55, 17, 0.85],
      "icon-allow-overlap": true,
      "text-field": ["step", ["zoom"], "", 16, ["concat", "▲ ", ["to-string", ["get", "votes"]]]],
      "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
      "text-size": 10,
      "text-offset": [0, 1.5],
      "text-anchor": "top",
      "text-optional": true,
    },
    paint: {
      "text-color": "#f6efff",
      "text-halo-color": "#140a2e",
      "text-halo-width": 1.4,
      "text-emissive-strength": 1,
      "icon-emissive-strength": 1,
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

export type BuildingTap = { name: string | null; center: LngLat; rings: LngLat[][] };

/** Name a tapped footprint by finding which OSM-named building point lies inside it. */
function buildingInfo(geometry: Polygon | MultiPolygon, tap: LngLat): BuildingTap {
  const rings = (geometry.type === "Polygon" ? [geometry.coordinates[0]] : geometry.coordinates.map((p) => p[0])) as LngLat[][];
  // Query geometry is clipped to tiles, so the label point may fall outside the piece we got.
  // Fall back to the nearest named building to the footprint's centre (not the tap: at 60° pitch
  // the tap's ground point can sit well behind the building).
  const ring = rings[0] ?? [];
  const center: LngLat = ring.length
    ? [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length]
    : tap;
  const named =
    CAMPUS_BUILDINGS.find((b) => rings.some((r) => pointInRing([b.lng, b.lat], r))) ??
    CAMPUS_BUILDINGS.map((b) => ({ b, d: distanceM(center, [b.lng, b.lat]) }))
      .filter((x) => x.d <= 60)
      .sort((a, z) => a.d - z.d)[0]?.b;
  return { name: named?.name ?? null, center: named ? [named.lng, named.lat] : center, rings };
}

const MISSION_ICONS: [string, string, string][] = [
  ["m-photo", "#ff4f8b", "M4 8h3l2-3h6l2 3h3v11H4z M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"],
  ["m-checkin", "#ff8a3d", "M6 21V4 M6 4h11l-2 4 2 4H6"],
  ["m-bus", "#2ee6d6", "M6 4h12a2 2 0 0 1 2 2v10H4V6a2 2 0 0 1 2-2z M4 11h16 M7 19v-3 M17 19v-3"],
  ["m-heist", "#7b2ff7", "M4 18h16 M4 18 3 7l5 4 4-6 4 6 5-4-1 11"],
  ["m-landmark", "#ffc857", "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"],
];

const TAG_GLYPH = "M5 5h14v10h-7l-4 4v-4H5z M8.5 9.5h7 M8.5 12h4";

function tagData(): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: getTags().tags.map((t) => ({
      type: "Feature",
      properties: { id: t.id, votes: t.votes, mine: t.mine },
      geometry: { type: "Point", coordinates: t.lngLat },
    })),
  };
}

const iconFor = (m: Mission) => (m.category ? "m-landmark" : `m-${m.type}`);

/** Round neon blip with a glyph (64×64 @2x). */
function missionIcon(color: string, glyph: string) {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 20, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#140a2e";
  ctx.stroke();
  ctx.translate(size / 2 - 12 * 0.95, size / 2 - 12 * 0.95);
  ctx.scale(0.95, 0.95);
  ctx.lineWidth = 2.4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#140a2e";
  ctx.stroke(new Path2D(glyph));
  return ctx.getImageData(0, 0, size, size);
}

function circlePolygon([lng, lat]: LngLat, radiusM: number): LngLat[] {
  const ring: LngLat[] = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    ring.push([lng + (radiusM * Math.sin(a)) / (111320 * Math.cos((lat * Math.PI) / 180)), lat + (radiusM * Math.cos(a)) / 111320]);
  }
  return ring;
}

/** Blips for every mission, except fogged landmarks which show an approximate area instead. */
function missionData(): { points: FeatureCollection; areas: FeatureCollection } {
  const done = getProgress().completions;
  const points: Feature[] = [];
  const areas: Feature[] = [];
  for (const m of MISSIONS) {
    const hidden = m.category && !done[m.slug] && !isRevealedAt(m.lngLat[1], m.lngLat[0]);
    if (hidden) {
      areas.push({
        type: "Feature",
        properties: { slug: m.slug },
        geometry: { type: "Polygon", coordinates: [circlePolygon(approxCenter(m), 150)] },
      });
    } else {
      points.push({
        type: "Feature",
        properties: { slug: m.slug, icon: iconFor(m), done: !!done[m.slug], title: m.title },
        geometry: { type: "Point", coordinates: m.lngLat },
      });
    }
  }
  return { points: { type: "FeatureCollection", features: points }, areas: { type: "FeatureCollection", features: areas } };
}

function districtShapes(): FeatureCollection {
  const unlocked = getProgress().districts;
  return {
    type: "FeatureCollection",
    features: DISTRICTS.map((d) => ({
      type: "Feature",
      properties: { name: d.name, unlocked: !!unlocked[d.name] },
      geometry: { type: "MultiPolygon", coordinates: d.polygons },
    })),
  };
}

function districtLabels(): FeatureCollection {
  const unlocked = getProgress().districts;
  return {
    type: "FeatureCollection",
    features: DISTRICTS.map((d) => ({
      type: "Feature",
      properties: { name: d.name, unlocked: !!unlocked[d.name] },
      geometry: { type: "Point", coordinates: d.label },
    })),
  };
}

function refreshDistricts(map: MapboxMap) {
  (map.getSource("districts") as GeoJSONSource | undefined)?.setData(districtShapes());
  (map.getSource("district-labels") as GeoJSONSource | undefined)?.setData(districtLabels());
}

function refreshMissions(map: MapboxMap) {
  const { points, areas } = missionData();
  (map.getSource("missions") as GeoJSONSource | undefined)?.setData(points);
  (map.getSource("mission-areas") as GeoJSONSource | undefined)?.setData(areas);
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

export default function MapView({ ref, onReady, onUnavailable, onMissionTap, onBuildingTap, onTagTap }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const followRef = useRef(false);
  const callbacks = useRef({ onReady, onUnavailable, onMissionTap, onBuildingTap, onTagTap });

  useEffect(() => {
    callbacks.current = { onReady, onUnavailable, onMissionTap, onBuildingTap, onTagTap };
  });

  useImperativeHandle(ref, () => ({
    flyToCampus: () =>
      mapRef.current?.flyTo({ center: CAMPUS_CENTER, zoom: 16.2, pitch: CAMPUS_PITCH, bearing: -30, padding: NO_PAD, duration: dur(2200), essential: true }),
    flyToCity: () =>
      mapRef.current?.flyTo({ center: LONDON_CENTER, zoom: 9.85, pitch: 25, bearing: 0, padding: NO_PAD, duration: dur(2200), essential: true }),
    center: () => {
      const c = mapRef.current?.getCenter();
      return c ? [c.lng, c.lat] : null;
    },
    follow: (lngLat) => mapRef.current?.easeTo({ center: lngLat, padding: NO_PAD, duration: dur(400), essential: true }),
    showMission: (slug) => {
      const m = missionBySlug(slug);
      const map = mapRef.current;
      if (!m || !map) return;
      followRef.current = false;
      const fogged = m.category && !getProgress().completions[slug] && !isRevealedAt(m.lngLat[1], m.lngLat[0]);
      map.flyTo({
        center: fogged ? approxCenter(m) : m.lngLat,
        zoom: fogged ? 15.2 : 16.4,
        pitch: CAMPUS_PITCH,
        // keep the target above the bottom sheet (~55% of the screen)
        padding: { top: 60, bottom: map.getContainer().clientHeight * 0.5, left: 0, right: 0 },
        duration: dur(1800),
        essential: true,
      });
    },
    setRoute: (route) =>
      (mapRef.current?.getSource("route") as GeoJSONSource | undefined)?.setData(
        route ? { type: "Feature", properties: {}, geometry: route } : EMPTY,
      ),
    showFriendArea: (cells, color = "#2ee6d6") => {
      const map = mapRef.current;
      const src = map?.getSource("friend-area") as GeoJSONSource | undefined;
      if (!map || !src) return;
      if (!cells?.length) return src.setData(EMPTY);
      const polys = cellsToMultiPolygon(cells, true) as LngLat[][][];
      src.setData({ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: polys } });
      map.setPaintProperty("friend-area-fill", "fill-color", color);
      map.setPaintProperty("friend-area-line", "line-color", color);
      // Frame their area above the sheet.
      let [w, s, e, n] = [180, 90, -180, -90];
      for (const poly of polys) for (const [x, y] of poly[0]) [w, s, e, n] = [Math.min(w, x), Math.min(s, y), Math.max(e, x), Math.max(n, y)];
      followRef.current = false;
      map.fitBounds(
        [
          [w, s],
          [e, n],
        ],
        { padding: { top: 110, bottom: 200, left: 30, right: 30 }, pitch: CITY_PITCH, maxZoom: 15.5, duration: dur(1600) },
      );
    },
    clearBuilding: () => (mapRef.current?.getSource("building-selected") as GeoJSONSource | undefined)?.setData(EMPTY),
    locate: (lngLat) => {
      followRef.current = true;
      mapRef.current?.flyTo({ center: lngLat, padding: NO_PAD, zoom: Math.max(mapRef.current.getZoom(), 16), duration: dur(1400), essential: true });
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
        config: { basemap: basemapConfig(currentLightPreset()) },
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
            refreshMissions(map);
          }, 80);
        }),
      );

      // Player: move the marker; follow the player until they pan the map themselves.
      // Missions: refresh when completions change; tap a blip or a "?" area to open it.
      let districtKey = "";
      cleanups.push(
        subscribeProgress(() => {
          if (!map.getSource("missions")) return;
          refreshMissions(map);
          const key = Object.keys(getProgress().districts).join("|");
          if (key !== districtKey) {
            districtKey = key;
            refreshDistricts(map);
          }
        }),
      );
      // Tags: redraw whenever the visible set changes.
      cleanups.push(subscribeTags(() => (map.getSource("tags") as GeoJSONSource | undefined)?.setData(tagData())));
      // One tap handler: mission blips / "?" areas win over the building underneath them.
      map.on("click", (e) => {
        const box: [[number, number], [number, number]] = [
          [e.point.x - 8, e.point.y - 8],
          [e.point.x + 8, e.point.y + 8],
        ];
        const mission = map.queryRenderedFeatures(box, { layers: ["mission-blips", "mission-areas-fill"] })[0];
        const slug = mission?.properties?.slug;
        if (typeof slug === "string") return callbacks.current.onMissionTap(slug);
        const tag = map.queryRenderedFeatures(box, { layers: ["tag-pins"] })[0];
        const tagId = tag?.properties?.id;
        if (typeof tagId === "string") return callbacks.current.onTagTap(tagId);

        const building = map.queryRenderedFeatures(e.point, { layers: ["building-selected", "mission-buildings", "campus-buildings"] })[0];
        if (building && (building.geometry.type === "Polygon" || building.geometry.type === "MultiPolygon")) {
          const geometry = building.geometry;
          (map.getSource("building-selected") as GeoJSONSource).setData({ type: "Feature", properties: building.properties ?? {}, geometry });
          callbacks.current.onBuildingTap(buildingInfo(geometry, [e.lngLat.lng, e.lngLat.lat]));
        }
      });
      for (const layer of ["mission-blips", "mission-areas-fill", "tag-pins", "campus-buildings", "mission-buildings"]) {
        map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
      }

      map.on("dragstart", () => {
        followRef.current = false;
      });
      let lastFollow = 0;
      cleanups.push(
        onFix((fix, first) => {
          setPlayer(map, fix);
          if (first) {
            followRef.current = true;
            map.flyTo({ center: fix.lngLat, padding: NO_PAD, zoom: Math.max(map.getZoom(), 16), duration: dur(1600), essential: true });
            lastFollow = performance.now();
          } else if (followRef.current && performance.now() - lastFollow > 450) {
            lastFollow = performance.now();
            map.easeTo({ center: fix.lngLat, padding: NO_PAD, duration: dur(450), essential: true });
          }
        }),
      );

      // Lighting follows the real sun over London; re-check every 10 minutes (or on demo override).
      let preset = currentLightPreset();
      const applyLight = () => {
        const next = currentLightPreset();
        if (next === preset || !map.isStyleLoaded()) return;
        preset = next;
        map.setConfigProperty("basemap", "lightPreset", next);
      };
      const lightTimer = setInterval(applyLight, 10 * 60_000);
      cleanups.push(() => clearInterval(lightTimer));
      cleanups.push(subscribeLight(applyLight));

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
