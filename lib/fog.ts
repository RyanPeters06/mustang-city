/**
 * Fog of war: revealed H3 cells, persisted on the device, rendered as ONE polygon
 * (London boundary with explored holes) — never thousands of hexes (Constitution V).
 */
import { cellsToMultiPolygon, gridDisk, latLngToCell, polygonToCells } from "h3-js";
import type { Feature, FeatureCollection, MultiLineString, Polygon } from "geojson";
import { CAMPUS_CENTER, LONDON_BOUNDARY, type LngLat } from "./geo";

export const H3_RES = 10;
const STORAGE_KEY = "mc.cells.v1";

export const RANKS = [
  { name: "Frosh", min: 0 },
  { name: "Local", min: 1000 },
  { name: "Made", min: 5000 },
  { name: "Legend of Forest State", min: 15000 },
] as const;

export type FogSnapshot = { count: number; pct: number; rep: number; rank: string };

let cells = new Set<string>();
let loaded = false;
let londonCells: Set<string> | null = null;
let snapshot: FogSnapshot = { count: 0, pct: 0, rep: 0, rank: "Frosh" };
const listeners = new Set<() => void>();
let persistTimer: ReturnType<typeof setTimeout> | undefined;

function london() {
  if (!londonCells) londonCells = new Set(polygonToCells(LONDON_BOUNDARY, H3_RES, true));
  return londonCells;
}

function defaultCells() {
  const [lng, lat] = CAMPUS_CENTER;
  return gridDisk(latLngToCell(lat, lng, H3_RES), 2);
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved: unknown = raw ? JSON.parse(raw) : null;
    cells = new Set(Array.isArray(saved) && saved.length ? (saved as string[]) : defaultCells());
  } catch {
    cells = new Set(defaultCells());
  }
  recompute();
}

function recompute() {
  const count = cells.size;
  const rep = count; // 1 Rep per cleared cell (brief → Progression)
  const rank = [...RANKS].reverse().find((r) => rep >= r.min)?.name ?? "Frosh";
  snapshot = { count, pct: (count / london().size) * 100, rep, rank };
}

function changed() {
  recompute();
  listeners.forEach((l) => l());
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...cells]));
    } catch {
      /* storage full / private mode — fog still works this session */
    }
  }, 500);
}

export function subscribe(listener: () => void) {
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  ensureLoaded();
  return snapshot;
}

const SERVER_SNAPSHOT: FogSnapshot = { count: 0, pct: 0, rep: 0, rank: "Frosh" };
export const getServerSnapshot = () => SERVER_SNAPSHOT;

/** Reveal the cell at a position plus its ring-1 neighbours. Returns number of new cells. */
export function revealAt(lat: number, lng: number) {
  ensureLoaded();
  const inLondon = london();
  let added = 0;
  for (const c of gridDisk(latLngToCell(lat, lng, H3_RES), 1)) {
    if (inLondon.has(c) && !cells.has(c)) {
      cells.add(c);
      added++;
    }
  }
  if (added) changed();
  return added;
}

export function isRevealedAt(lat: number, lng: number) {
  ensureLoaded();
  return cells.has(latLngToCell(lat, lng, H3_RES));
}

export function resetFog() {
  ensureLoaded();
  cells = new Set(defaultCells());
  changed();
}

/** Build the fog layer data and the soft-edge lines from the revealed cells. */
export function buildFog(): { fog: FeatureCollection<Polygon>; edges: Feature<MultiLineString> } {
  ensureLoaded();
  const regions = cells.size ? cellsToMultiPolygon([...cells], true) : [];
  const holes: LngLat[][] = [];
  const islands: Feature<Polygon>[] = [];
  const edgeLines: LngLat[][] = [];

  for (const region of regions) {
    const [outer, ...inner] = region as LngLat[][];
    holes.push(outer);
    edgeLines.push(outer);
    for (const loop of inner) {
      // Unexplored pocket fully surrounded by explored cells — still fogged.
      islands.push({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [loop] } });
      edgeLines.push(loop);
    }
  }

  return {
    fog: {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [LONDON_BOUNDARY, ...holes] } },
        ...islands,
      ],
    },
    edges: { type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: edgeLines } },
  };
}
