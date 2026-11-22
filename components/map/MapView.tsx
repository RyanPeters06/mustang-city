"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import type { Map as MapboxMap, GeoJSONSource } from "mapbox-gl";
import type { Feature, FeatureCollection, LineString, MultiPolygon, Polygon } from "geojson";
import { cellsToMultiPolygon } from "h3-js";
import { MISSIONS, approxCenter, missionBySlug, type Mission } from "@/lib/missions";
import { getSnapshot as getProgress, subscribe as subscribeProgress } from "@/lib/progress";
import { DISTRICTS, districtIndexAt } from "@/lib/districts";
import { buildFog, isRevealedAt, subscribe } from "@/lib/fog";
import { REVEAL_ACCURACY_M, getLastFix, onFix, type Fix } from "@/lib/location";
import { getTags, subscribeTags } from "@/lib/tags";
import { onBusFrame, subscribeBuses } from "@/lib/buses";
import { getTurf, subscribeTurf } from "@/lib/turf";
import { COLLECTIBLES } from "@/lib/collectibles";
import { getStaleCells, subscribeFogAge } from "@/lib/fogAge";
import campusModels from "@/lib/data/campusModels.json";
import { facultyColor } from "@/lib/faculty";
import { LTC, routeById } from "@/lib/ltcData";
import type { Vehicle } from "@/lib/ltc";
import {
  CAMPUS_BUILDINGS,
  CAMPUS_CENTER,
  CAMPUS_RING,
  LONDON_BOUNDARY,
  LONDON_CENTER,
  MAX_BOUNDS,
  MISSION_BUILDINGS,
  SEA_RING,
  inCampus,
  distanceM,
  type LngLat,
} from "@/lib/geo";
import { ATMOSPHERE, CAMPUS_PITCH, CAMPUS_ZOOM, CITY_PITCH, basemapConfig, currentLightPreset, subscribeLight } from "@/lib/mapStyle";

export type IntroStep = "forest" | "mustang" | "done";

export type MapHandle = {
  /** Park the camera over the whole of Forest State, behind the title card. */
  prepareIntro: () => void;
  /** Cinematic flight: Forest State overview → swoop down into Mustang City. Resolves when it lands. */
  playIntro: (onStep: (s: IntroStep) => void) => Promise<void>;
  /** Jump straight to the end of the intro. */
  skipIntro: () => void;
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
  /** Lower the raised neighbourhood. */
  clearDistrict: () => void;
  /** Legend toggles: show/hide a group of map layers. */
  setGroupVisible: (group: LayerGroup, on: boolean) => void;
};

export type LayerGroup = "buses" | "tags" | "collectibles" | "landmarks";
const GROUP_LAYERS: Record<LayerGroup, string[]> = {
  buses: ["bus-dots", "bus-labels", "bus-routes"],
  tags: ["tag-pins"],
  collectibles: ["collectible-pins"],
  landmarks: ["mission-areas-fill", "mission-areas-line", "mission-area-labels"],
};

type Props = {
  ref?: Ref<MapHandle>;
  onReady: () => void;
  onUnavailable: (reason: string) => void;
  onMissionTap: (slug: string) => void;
  onBuildingTap: (b: BuildingTap) => void;
  onTagTap: (id: string) => void;
  onDistrictTap: (name: string) => void;
  onCollectibleTap: (id: string) => void;
};

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const dur = (ms: number) => (reducedMotion() ? 0 : ms);
const NO_PAD = { top: 0, bottom: 0, left: 0, right: 0 };
/** Furthest zoom-out (MAX_BOUNDS also clamps to ~9.8): Forest State fills the screen instead of shrinking to a sliver. */
const MIN_ZOOM = 9.6;
/** Max tilt by zoom: 45° at the city overview, rising to the full 70° once you're down at street level. */
const pitchLimit = (z: number) => Math.round(45 + Math.min(1, Math.max(0, (z - 11) / 2.5)) * 25);

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
type CampusModel = { id: string; name: string; url: string; anchor: LngLat; footprint: LngLat[][]; heights: number[] };
const MODELS = campusModels as unknown as CampusModel[];
const MODEL_RINGS = MODELS.flatMap((m) => m.footprint);
const MODEL_PARTS = MODELS.flatMap((m) => m.footprint.map((ring, i) => ({ ring, height: m.heights[i] ?? 12 })));

/**
 * Which modelled building is visible under a tapped pixel (Mapbox can't hit-test model layers).
 * Walk the ground points from the tap toward the camera (down the screen); a building at ground
 * distance d in front of the tap's ground point blocks the line of sight if its height ≥ d / tan(pitch).
 * The visible one is the blocking building closest to the camera.
 */
function modelPartUnderRay(map: MapboxMap, point: { x: number; y: number }) {
  // Real sight line: from the tapped ground point back to the camera (position + altitude).
  const g0 = map.unproject([point.x, point.y]);
  const tap: LngLat = [g0.lng, g0.lat];
  const cam = map.getFreeCameraOptions().position;
  if (!cam) return null;
  const camLL = cam.toLngLat();
  const camGround: LngLat = [camLL.lng, camLL.lat];
  const camAlt = cam.toAltitude();
  const D = distanceM(tap, camGround);
  if (!(D > 1) || !(camAlt > 1)) return null;
  let blocker: (typeof MODEL_PARTS)[number] | null = null;
  let crossed: (typeof MODEL_PARTS)[number] | null = null;
  for (let s = 0; s < Math.min(D, 1500); s += 3) {
    const t = s / D;
    const here: LngLat = [tap[0] + (camGround[0] - tap[0]) * t, tap[1] + (camGround[1] - tap[1]) * t];
    const part = MODEL_PARTS.find((p) => pointInRing(here, p.ring));
    if (!part) continue;
    const lineHeight = camAlt * t;
    if (part.height + 1 >= lineHeight) blocker = part; // tall enough to block the line here
    else if (part.height * 2.5 + 4 >= lineHeight) crossed = part; // line skims the roof: towers/spires
  }
  return blocker ?? crossed;
}

/** Which modelled building was tapped: footprint under the ground point, else the nearest one (tall models at pitch). */
function modelPartAt(tap: LngLat, near: boolean) {
  const inside = MODEL_PARTS.find((p) => pointInRing(tap, p.ring));
  if (inside) return inside;
  let best: (typeof MODEL_PARTS)[number] | null = null;
  let bestD = near ? 80 : 45;
  for (const p of MODEL_PARTS) {
    const c: LngLat = [p.ring.reduce((s2, v) => s2 + v[0], 0) / p.ring.length, p.ring.reduce((s2, v) => s2 + v[1], 0) / p.ring.length];
    const d = distanceM(tap, c);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}
/** True when a tile building overlaps any model footprint (tiles split buildings, so test vertices both ways). */
function replacedByModel(g: Feature["geometry"]) {
  const rings = (g.type === "Polygon" ? [g.coordinates[0]] : g.type === "MultiPolygon" ? g.coordinates.map((p) => p[0]) : []) as LngLat[][];
  return rings.some((ring) =>
    MODEL_RINGS.some((m) => {
      let hits = 0;
      for (const v of ring) if (pointInRing(v, m)) hits++;
      if (hits >= Math.max(1, Math.ceil(ring.length * 0.5))) return true; // mostly inside a model
      return m.some((v) => pointInRing(v, ring));
    }),
  );
}
/** Night/dusk = glowing windows; dawn/day = reflective glass (separate `-day` glb, loaded on demand). */
const isNightLook = (preset: string) => preset === "night" || preset === "dusk";
const modelIdExpr = (preset: string) => (isNightLook(preset) ? ["get", "model"] : ["concat", ["get", "model"], "-day"]) as never;
// Models load in the background after the map is first drawn. Until a set is fully loaded the plain
// extrusions stay up, so nobody ever sees a gap where a building should be (or a half-loaded set).
const variantUrl = (m: CampusModel, suffix: string) => new URL(m.url.replace(/\.glb$/, `${suffix}.glb`), window.location.origin).href;
const readyVariants = new Set<string>();
const loadingVariants = new Map<string, Promise<void>>();
function ensureVariant(map: MapboxMap, suffix: string) {
  if (readyVariants.has(suffix)) return Promise.resolve();
  let p = loadingVariants.get(suffix);
  if (!p) {
    p = (async () => {
      // Warm the HTTP cache in parallel, then register with Mapbox and wait for it to settle.
      await Promise.all(MODELS.map((m) => fetch(variantUrl(m, suffix)).then((r) => r.arrayBuffer()).catch(() => null)));
      for (const m of MODELS) if (!map.hasModel(m.id + suffix)) map.addModel(m.id + suffix, variantUrl(m, suffix));
      await new Promise<void>((resolve) => {
        map.once("idle", () => resolve());
        map.triggerRepaint();
      });
      readyVariants.add(suffix);
    })();
    loadingVariants.set(suffix, p);
  }
  return p;
}
let wantedPreset = "";
async function applyModelVariant(map: MapboxMap, preset: string) {
  wantedPreset = preset;
  const suffix = isNightLook(preset) ? "" : "-day";
  await ensureVariant(map, suffix);
  if (wantedPreset !== preset || !map.getLayer("campus-models")) return; // a newer switch won
  map.setLayoutProperty("campus-models", "model-id", modelIdExpr(preset));
  if (map.getLayoutProperty("campus-models", "visibility") === "none") {
    // First set is in: show the models and drop the stand-in extrusions under them.
    map.setLayoutProperty("campus-models", "visibility", "visible");
    for (const id of ["campus-buildings", "mission-buildings"]) if (map.getLayer(id)) map.setFilter(id, ["!", ["get", "modelled"]]);
  }
}
/** Windows glow at night, barely by day. */
const modelGlow = (preset: string) => (preset === "night" ? 1 : preset === "dusk" || preset === "dawn" ? 0.7 : 0.12);

/** Ease so a tapped building sits in the visible map above the bottom sheet. */
function frameBuilding(map: MapboxMap, ring: LngLat[]) {
  let [w, s2, e2, n] = [180, 90, -180, -90];
  for (const [x, y] of ring) [w, s2, e2, n] = [Math.min(w, x), Math.min(s2, y), Math.max(e2, x), Math.max(n, y)];
  const h = map.getContainer().clientHeight;
  map.fitBounds(
    [
      [w, s2],
      [e2, n],
    ],
    {
      padding: { top: 110, bottom: h * 0.55, left: 60, right: 60 },
      pitch: Math.max(map.getPitch(), 50),
      bearing: map.getBearing(),
      maxZoom: 17.6,
      duration: dur(900),
      essential: true,
    },
  );
}

/** Blips + labels: hidden during the intro dive so nothing pops in mid-flight, faded back in on landing. */
const OVERLAY_SYMBOLS = ["mission-blips", "mission-area-labels", "tag-pins", "collectible-pins", "campus-labels", "district-labels", "bus-labels", "bus-dots"];
function setOverlays(map: MapboxMap, on: boolean) {
  for (const id of OVERLAY_SYMBOLS) {
    if (!map.getLayer(id)) continue;
    map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
  }
}

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
    // Buildings with a hand-built model are kept as stand-ins (filtered out once the models load).
    const modelled = replacedByModel(g);
    const key = `${f.id ?? ""}:${first[0].toFixed(6)},${first[1].toFixed(6)}`;
    const feature: Feature = { type: "Feature", properties: { ...(f.properties ?? {}), modelled }, geometry: g };
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
        0, "#5c4d93",
        20, "#8173bf",
        45, "#a996dd",
      ],
      "fill-extrusion-height": ["+", ["coalesce", ["get", "height"], 10], 1.5],
      "fill-extrusion-base": ["coalesce", ["get", "min_height"], 0],
      "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 14.5, 0, 15.5, 0.92],
      "fill-extrusion-vertical-gradient": true,
      "fill-extrusion-emissive-strength": 0.35,
    },
  });
  map.addLayer({
    id: "mission-buildings",
    type: "fill-extrusion",
    source: "mission-buildings",
    slot: "middle",
    minzoom: 14.5,
    paint: {
      "fill-extrusion-color": "#efb86a",
      "fill-extrusion-height": ["+", ["coalesce", ["get", "height"], 12], 3],
      "fill-extrusion-base": ["coalesce", ["get", "min_height"], 0],
      "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 14.5, 0, 15.5, 0.96],
      "fill-extrusion-vertical-gradient": true,
      "fill-extrusion-emissive-strength": 0.55,
    },
  });

  // --- Hand-built 3D landmarks (scripts/build-models.mjs): replace the plain extrusions ------
  map.addSource("model-footprints", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: MODEL_RINGS.map((r) => ({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [r] } })),
    },
  });
  // Hide the basemap's own buildings (and its trees) where our models stand.
  map.addLayer({ id: "model-clip", type: "clip", source: "model-footprints", layout: { "clip-layer-types": ["model"], "clip-layer-scope": ["basemap"] } });
  map.addSource("campus-models", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: MODELS.map((m) => ({ type: "Feature", properties: { model: m.id }, geometry: { type: "Point", coordinates: m.anchor } })),
    },
  });
  map.addLayer({
    id: "campus-models",
    type: "model",
    source: "campus-models",
    slot: "middle",
    minzoom: 15,
    layout: { "model-id": modelIdExpr(currentLightPreset()), visibility: "none" }, // shown once loaded (applyModelVariant)
    paint: {
      "model-scale": [1, 1, 1],
      "model-emissive-strength": modelGlow(currentLightPreset()),
      "model-cast-shadows": true,
      "model-opacity": ["interpolate", ["linear"], ["zoom"], 15, 0, 15.6, 1],
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
      "line-width": ["interpolate", ["exponential", 2], ["zoom"], 11, 6, 16, 70, 18, 240],
      "line-blur": ["interpolate", ["exponential", 2], ["zoom"], 11, 6, 16, 70, 18, 240],
      "line-emissive-strength": 1,
    },
  });

  // --- Fog decay: ground not revisited in 6 months fades under a haze (still explored) -----
  map.addSource("fog-stale", { type: "geojson", data: staleData() });
  map.addLayer({
    id: "fog-stale",
    type: "fill",
    source: "fog-stale",
    slot: "top",
    paint: { "fill-color": "#140a2e", "fill-opacity": 0.6, "fill-emissive-strength": 1 },
  });

  // --- Ghost city under the fog: major roads + the Thames, faint at overview zoom ---------
  // (Sits above the fog but below the sea, so it only shows inside Forest State.)
  map.addLayer({
    id: "ghost-water",
    type: "line",
    source: "streets",
    "source-layer": "waterway",
    slot: "top",
    filter: ["==", ["get", "class"], "river"],
    paint: {
      "line-color": "#2ee6d6",
      "line-width": ["interpolate", ["linear"], ["zoom"], 9.4, 1.2, 13, 3],
      "line-opacity": ["interpolate", ["linear"], ["zoom"], 9.4, 0.55, 13, 0.35, 15, 0],
      "line-emissive-strength": 1,
    },
  });
  map.addLayer({
    id: "ghost-roads",
    type: "line",
    source: "streets",
    "source-layer": "road",
    slot: "top",
    filter: ["match", ["get", "class"], ["motorway", "trunk", "primary", "secondary"], true, false],
    layout: { "line-join": "round", "line-cap": "round" },
    paint: {
      "line-color": ["match", ["get", "class"], ["motorway", "trunk"], "#ff8a3d", "#f6efff"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 9.4, ["match", ["get", "class"], ["motorway", "trunk"], 1.4, 0.6], 13, ["match", ["get", "class"], ["motorway", "trunk"], 2.4, 1.2]],
      "line-opacity": ["interpolate", ["linear"], ["zoom"], 9.4, 0.32, 12.5, 0.18, 14, 0],
      "line-emissive-strength": 1,
    },
  });

  // --- Selected region (tap a neighbourhood at city zoom): it rises out of the map ---
  // (outline glow layers are added with the source below)
  map.addSource("district-selected", { type: "geojson", data: EMPTY });
  map.addLayer({
    id: "district-selected-glow",
    type: "line",
    source: "district-selected",
    slot: "top",
    layout: { "line-join": "round" },
    paint: { "line-color": "#ff7aa8", "line-width": 10, "line-blur": 8, "line-opacity": 0.7, "line-emissive-strength": 1 },
  });
  map.addLayer({
    id: "district-selected-line",
    type: "line",
    source: "district-selected",
    slot: "top",
    layout: { "line-join": "round" },
    paint: { "line-color": "#ffe1ec", "line-width": 1.6, "line-emissive-strength": 1 },
  });
  map.addLayer({
    id: "district-selected-fill",
    type: "fill-extrusion",
    source: "district-selected",
    slot: "top",
    paint: {
      "fill-extrusion-color": "#ff7aa8",
      "fill-extrusion-height": 0,
      "fill-extrusion-height-transition": { duration: 800, delay: 0 },
      "fill-extrusion-opacity": 0.32,
      "fill-extrusion-vertical-gradient": true,
      "fill-extrusion-emissive-strength": 1,
    },
  });

  // --- Mustang City border: Western's real campus boundary, always explored, crisp neon edge ---
  map.addSource("campus-border", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: CAMPUS_RING } } });
  map.addLayer({
    id: "campus-border-glow",
    type: "line",
    source: "campus-border",
    slot: "top",
    layout: { "line-join": "miter" },
    paint: {
      "line-color": "#ff6f91",
      "line-width": ["interpolate", ["linear"], ["zoom"], 11, 4, 16, 14],
      "line-blur": ["interpolate", ["linear"], ["zoom"], 11, 4, 16, 12],
      "line-opacity": 0.55,
      "line-emissive-strength": 1,
    },
  });
  map.addLayer({
    id: "campus-border-line",
    type: "line",
    source: "campus-border",
    slot: "top",
    layout: { "line-join": "miter" },
    paint: {
      "line-color": "#ffd58a",
      "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1.2, 16, 2.6],
      "line-emissive-strength": 1,
    },
  });

  // --- Island: open sea around Forest State, glowing coastline ----------
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
  // Chart grid over the sea (map-menu feel); fades out as you zoom into the streets.
  map.addSource("chart-grid", { type: "geojson", data: chartGrid() });
  map.addLayer({
    id: "chart-grid",
    type: "line",
    source: "chart-grid",
    slot: "top",
    paint: {
      "line-color": "#2ee6d6",
      "line-width": 0.6,
      "line-opacity": ["interpolate", ["linear"], ["zoom"], 9.4, 0.16, 12, 0],
      "line-emissive-strength": 1,
    },
  });
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
        { type: "Feature", properties: { name: "MUSTANG CITY", size: 0.6 }, geometry: { type: "Point", coordinates: [CAMPUS_CENTER[0], CAMPUS_CENTER[1] + 0.009] } },
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
      "text-size": ["interpolate", ["linear"], ["zoom"], 9.4, ["*", ["get", "size"], 22], 13, ["*", ["get", "size"], 32]],
      "text-letter-spacing": 0.25,
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": ["case", ["==", ["get", "name"], "FOREST STATE"], "#ff4f8b", "#ffc857"],
      "text-halo-color": "#140a2e",
      "text-halo-width": 2,
      "text-halo-blur": 1,
      "text-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        10.2,
        1,
        11,
        ["case", ["==", ["get", "name"], "FOREST STATE"], 0, 1],
        13.5,
        ["case", ["==", ["get", "name"], "FOREST STATE"], 0, 1],
        14.5,
        0,
      ],
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
    minzoom: 15.4,
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 15.4, 9.5, 18, 13],
      "text-transform": "uppercase",
      "text-letter-spacing": 0.08,
      "text-max-width": 7,
      "text-padding": 14,
      "symbol-z-elevate": true,
      "symbol-sort-key": ["case", ["get", "revealed"], 0, 1],
    },
    paint: {
      "text-color": "#fff1c9",
      "text-opacity": ["case", ["get", "revealed"], 0.92, 0],
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
      "fill-extrusion-color": "#7ff3e8",
      "fill-extrusion-height": ["+", ["coalesce", ["get", "height"], 12], 3],
      "fill-extrusion-base": ["coalesce", ["get", "min_height"], 0],
      "fill-extrusion-opacity": 0.42,
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
  // Faculty turf: neighbourhoods tinted by the faculty that has cleared the most of them.
  map.addSource("turf", { type: "geojson", data: turfData() });
  map.addLayer({
    id: "turf-fill",
    type: "fill",
    source: "turf",
    slot: "top",
    maxzoom: 14,
    paint: {
      "fill-color": ["get", "color"],
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 9.4, 0.3, 12.5, 0.2, 14, 0],
      "fill-emissive-strength": 1,
    },
  });
  map.addLayer({
    id: "district-lines",
    type: "line",
    source: "districts",
    slot: "top",
    minzoom: 9,
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
    minzoom: 9.6,
    maxzoom: 14,
    layout: {
      "text-field": ["upcase", ["get", "name"]],
      "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 9.6, 8, 11, 10, 13, 15],
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
    paint: {
      "fill-color": "#ffc857",
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0.14, 16, 0.05],
      "fill-emissive-strength": 1,
    },
  });
  map.addLayer({
    id: "mission-areas-line",
    type: "line",
    source: "mission-areas",
    slot: "top",
    paint: {
      "line-color": "#ffc857",
      "line-width": 1.2,
      "line-dasharray": [2, 2],
      "line-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0.8, 16, 0.45],
      "line-emissive-strength": 1,
    },
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
      "icon-size": ["interpolate", ["linear"], ["zoom"], 9.4, 0.42, 11, 0.6, 16, 1],
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

  // --- LTC buses: route lines (static GTFS) + live vehicles (GTFS-realtime) ---------------
  map.addSource("bus-routes", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: LTC.shapes.map((sh) => ({
        type: "Feature",
        properties: { route: sh.route, color: routeById(sh.route)?.color ?? "#2ee6d6" },
        geometry: { type: "LineString", coordinates: sh.line },
      })),
    },
  });
  map.addLayer({
    id: "bus-routes",
    type: "line",
    source: "bus-routes",
    slot: "top",
    minzoom: 12.5,
    layout: { "line-join": "round", "line-cap": "round" },
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 12.5, 1, 16, 2.5],
      "line-opacity": ["interpolate", ["linear"], ["zoom"], 12.5, 0, 13.5, 0.35],
      "line-emissive-strength": 1,
    },
  });
  map.addSource("buses", { type: "geojson", data: EMPTY });
  map.addLayer({
    id: "bus-dots",
    type: "circle",
    source: "buses",
    slot: "top",
    minzoom: 12.5,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 12.5, 4, 16, 9],
      "circle-color": ["get", "color"],
      "circle-stroke-color": "#140a2e",
      "circle-stroke-width": 2,
      "circle-emissive-strength": 1,
    },
  });
  map.addLayer({
    id: "bus-labels",
    type: "symbol",
    source: "buses",
    slot: "top",
    minzoom: 14,
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
      "text-size": 9,
      "text-allow-overlap": true,
    },
    paint: { "text-color": "#140a2e", "text-emissive-strength": 1 },
  });

  // --- Collectibles: only the ones you've found (hidden until within 50 m) ----------------
  map.addImage("collectible", missionIcon("#ffc857", "M12 4 19 12 12 20 5 12Z"), { pixelRatio: 2 });
  map.addSource("collectibles", { type: "geojson", data: collectibleData() });
  map.addLayer({
    id: "collectible-pins",
    type: "symbol",
    source: "collectibles",
    slot: "top",
    minzoom: 12,
    layout: { "icon-image": "collectible", "icon-size": ["interpolate", ["linear"], ["zoom"], 12, 0.45, 17, 0.75], "icon-allow-overlap": true },
    paint: { "icon-emissive-strength": 1 },
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

  // Place the big island/campus names first so district labels make room instead of being overprinted.
  if (map.getLayer("island-names")) map.moveLayer("island-names");

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

function busData(vs: Vehicle[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: vs.map((v) => {
      const r = routeById(v.route);
      return {
        type: "Feature",
        properties: { id: v.id, route: v.route, name: r?.name ?? v.route.replace(/^0/, ""), color: r?.color ?? "#2ee6d6" },
        geometry: { type: "Point", coordinates: v.lngLat },
      };
    }),
  };
}

function collectibleData(): FeatureCollection {
  const finds = getProgress().finds;
  return {
    type: "FeatureCollection",
    features: COLLECTIBLES.filter((c) => finds[c.id]).map((c) => ({
      type: "Feature",
      properties: { id: c.id },
      geometry: { type: "Point", coordinates: c.lngLat },
    })),
  };
}

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
        geometry: { type: "Polygon", coordinates: [circlePolygon(approxCenter(m), 110)] }, // ≥ max offset (90 m): still contains the spot
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

/** Lat/lng chart grid across the sea box (every 0.1°). */
function chartGrid(): FeatureCollection {
  const xs = SEA_RING.map((p) => p[0]);
  const ys = SEA_RING.map((p) => p[1]);
  const [w, e, s, n] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const features: Feature[] = [];
  for (let x = Math.ceil(w * 10) / 10; x <= e; x += 0.1)
    features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[x, s], [x, n]] } });
  for (let y = Math.ceil(s * 10) / 10; y <= n; y += 0.1)
    features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[w, y], [e, y]] } });
  return { type: "FeatureCollection", features };
}

/** Raise (or lower, with -1) a neighbourhood out of the map. */
function raiseDistrict(map: MapboxMap, index: number) {
  const src = map.getSource("district-selected") as GeoJSONSource | undefined;
  if (!src) return;
  if (index < 0) {
    map.setPaintProperty("district-selected-fill", "fill-extrusion-height", 0);
    setTimeout(() => src.setData(EMPTY), 700);
    return;
  }
  const d = DISTRICTS[index];
  map.setPaintProperty("district-selected-fill", "fill-extrusion-height", 0);
  src.setData({ type: "Feature", properties: { name: d.name }, geometry: { type: "MultiPolygon", coordinates: d.polygons } });
  requestAnimationFrame(() => map.setPaintProperty("district-selected-fill", "fill-extrusion-height", 220));
}

function turfData(): FeatureCollection {
  const rows = getTurf().rows;
  return {
    type: "FeatureCollection",
    features: rows.flatMap((r) => {
      const d = DISTRICTS.find((x) => x.name === r.district);
      return d ? [{ type: "Feature" as const, properties: { color: facultyColor(r.faculty) }, geometry: { type: "MultiPolygon" as const, coordinates: d.polygons } }] : [];
    }),
  };
}

function staleData(): FeatureCollection {
  const stale = getStaleCells();
  if (!stale.length) return EMPTY;
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: cellsToMultiPolygon(stale, true) as LngLat[][][] } }],
  };
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

export default function MapView({ ref, onReady, onUnavailable, onMissionTap, onBuildingTap, onTagTap, onDistrictTap, onCollectibleTap }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const followRef = useRef(false);
  const introRef = useRef<{ skip: () => void } | null>(null);
  const callbacks = useRef({ onReady, onUnavailable, onMissionTap, onBuildingTap, onTagTap, onDistrictTap, onCollectibleTap });

  useEffect(() => {
    callbacks.current = { onReady, onUnavailable, onMissionTap, onBuildingTap, onTagTap, onDistrictTap, onCollectibleTap };
  });

  useImperativeHandle(ref, () => ({
    prepareIntro: () => {
      const map = mapRef.current;
      if (!map) return;
      setOverlays(map, false);
      map.jumpTo({ center: LONDON_CENTER, zoom: 9.4, pitch: 0, bearing: 0, padding: NO_PAD });
    },
    skipIntro: () => introRef.current?.skip(),
    playIntro: (onStep) => {
      const map = mapRef.current;
      const end = { center: CAMPUS_CENTER, zoom: 16.2, pitch: CAMPUS_PITCH, bearing: -30, padding: NO_PAD };
      if (!map || reducedMotion()) {
        if (map) setOverlays(map, true);
        map?.jumpTo(end);
        onStep("done");
        return Promise.resolve();
      }
      followRef.current = false;
      return new Promise<void>((resolve) => {
        let finished = false;
        const timers: ReturnType<typeof setTimeout>[] = [];
        const finish = () => {
          if (finished) return;
          finished = true;
          timers.forEach(clearTimeout);
          map.off("moveend", onMoveEnd);
          introRef.current = null;
          setOverlays(map, true);
          onStep("done");
          resolve();
        };
        const fly = (opts: Parameters<MapboxMap["flyTo"]>[0]) => map.flyTo({ ...opts, essential: true });
        let leg = 0;
        const onMoveEnd = () => {
          if (finished) return;
          leg++;
          if (leg === 1) {
            onStep("mustang");
            fly({ ...end, duration: 4600, curve: 1.5 });
          } else finish();
        };
        introRef.current = {
          skip: () => {
            map.stop();
            map.jumpTo(end);
            finish();
          },
        };
        onStep("forest");
        map.on("moveend", onMoveEnd);
        // Leg 1: slow push-in and tilt over the whole island; leg 2 (on moveend): dive into campus.
        fly({ center: LONDON_CENTER, zoom: 10.3, pitch: 40, bearing: -14, duration: 2800 });
        timers.push(setTimeout(finish, 12_000)); // safety: never trap the player in the intro
      });
    },
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
    setGroupVisible: (group, on) => {
      const map = mapRef.current;
      if (!map) return;
      for (const id of GROUP_LAYERS[group]) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    },
    clearDistrict: () => {
      if (mapRef.current) raiseDistrict(mapRef.current, -1);
    },
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
        minZoom: MIN_ZOOM,
        maxBounds: MAX_BOUNDS,
        attributionControl: false,
      });
      mapRef.current = map;
      if (process.env.NODE_ENV !== "production") (window as unknown as { __mcMap: MapboxMap }).__mcMap = map;
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

      // Tilt limit eases in with zoom: zoomed out, a full 70° tilt is mostly empty sky.
      const fitPitch = () => {
        const max = pitchLimit(map.getZoom());
        if (map.getMaxPitch() !== max) map.setMaxPitch(max);
      };
      map.on("zoom", fitPitch);
      fitPitch();

      map.on("style.load", () => {
        map.setFog(ATMOSPHERE);
        addGameLayers(map);
      });
      map.once("idle", () => {
        callbacks.current.onReady();
        // Heavy 3D models stream in after the first frame so the loading screen isn't held up by them.
        void applyModelVariant(map, currentLightPreset());
      });

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
          (map.getSource("collectibles") as GeoJSONSource | undefined)?.setData(collectibleData());
          const key = Object.keys(getProgress().districts).join("|");
          if (key !== districtKey) {
            districtKey = key;
            refreshDistricts(map);
          }
        }),
      );
      cleanups.push(subscribeFogAge(() => (map.getSource("fog-stale") as GeoJSONSource | undefined)?.setData(staleData())));
      cleanups.push(subscribeTurf(() => (map.getSource("turf") as GeoJSONSource | undefined)?.setData(turfData())));
      // Buses: glide every frame between 15 s updates.
      cleanups.push(onBusFrame((vs) => (map.getSource("buses") as GeoJSONSource | undefined)?.setData(busData(vs))));
      cleanups.push(subscribeBuses(() => {}));
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
        const col = map.queryRenderedFeatures(box, { layers: ["collectible-pins"] })[0]?.properties?.id;
        if (typeof col === "string") return callbacks.current.onCollectibleTap(col);
        const tag = map.queryRenderedFeatures(box, { layers: ["tag-pins"] })[0];
        const tagId = tag?.properties?.id;
        if (typeof tagId === "string") return callbacks.current.onTagTap(tagId);

        // City zoom: tap a neighbourhood and it rises out of the map.
        if (map.getZoom() < 14) {
          const idx = districtIndexAt([e.lngLat.lng, e.lngLat.lat]);
          if (idx >= 0) {
            raiseDistrict(map, idx);
            const [w, s2, e2, n] = DISTRICTS[idx].bbox;
            followRef.current = false;
            map.fitBounds(
              [
                [w, s2],
                [e2, n],
              ],
              {
                padding: { top: 90, bottom: map.getContainer().clientHeight * 0.52, left: 40, right: 40 },
                pitch: 50,
                bearing: map.getBearing(),
                maxZoom: 14,
                duration: dur(1200),
                essential: true,
              },
            );
            return callbacks.current.onDistrictTap(DISTRICTS[idx].name);
          }
          return;
        }
        const modelsOn = map.getLayoutProperty("campus-models", "visibility") !== "none";
        const part = modelsOn ? (modelPartUnderRay(map, e.point) ?? modelPartAt([e.lngLat.lng, e.lngLat.lat], false)) : null;
        if (part) {
          const geometry: Polygon = { type: "Polygon", coordinates: [part.ring] };
          (map.getSource("building-selected") as GeoJSONSource).setData({ type: "Feature", properties: { height: part.height + 2 }, geometry });
          followRef.current = false;
          frameBuilding(map, part.ring);
          return callbacks.current.onBuildingTap(buildingInfo(geometry, [e.lngLat.lng, e.lngLat.lat]));
        }
        const building = map.queryRenderedFeatures(e.point, { layers: ["building-selected", "mission-buildings", "campus-buildings"] })[0];
        if (building && (building.geometry.type === "Polygon" || building.geometry.type === "MultiPolygon")) {
          const geometry = building.geometry;
          (map.getSource("building-selected") as GeoJSONSource).setData({ type: "Feature", properties: building.properties ?? {}, geometry });
          followRef.current = false;
          frameBuilding(map, (geometry.type === "Polygon" ? geometry.coordinates[0] : geometry.coordinates[0][0]) as LngLat[]);
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
        if (map.getLayer("campus-models")) map.setPaintProperty("campus-models", "model-emissive-strength", modelGlow(next));
        void applyModelVariant(map, next);
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
