/**
 * Fog of war: revealed H3 cells, persisted on the device, rendered as ONE polygon
 * (London boundary with explored holes) — never thousands of hexes (Constitution V).
 *
 * Resolution 11 (~25 m cells) so the cleared area around the player reads as a circle:
 * every cell whose centre lies within REVEAL_RADIUS_M of an accepted fix is revealed.
 */
import { cellToChildren, cellToLatLng, cellsToMultiPolygon, gridDisk, latLngToCell, polygonToCells } from "h3-js";
import type { Feature, FeatureCollection, MultiLineString, Polygon } from "geojson";
import { CAMPUS_CENTER, LONDON_BOUNDARY, distanceM, type LngLat } from "./geo";
import { fogRepFromCells, rankFor } from "./rank";

export const H3_RES = 11;
export const REVEAL_RADIUS_M = 100;
const RING_K = 5; // res-11 centre spacing ≈ 43 m, so k=5 safely covers a 100 m radius
const STORAGE_KEY = "mc.cells.v2";
const LEGACY_KEY = "mc.cells.v1"; // res 10

export { RANKS } from "./rank";

export type FogSnapshot = { count: number; pct: number; rep: number; rank: string };

let cells = new Set<string>();
let loaded = false;
let londonCellCount = 0;
let snapshot: FogSnapshot = { count: 0, pct: 0, rep: 0, rank: "Frosh" };
const listeners = new Set<() => void>();
let persistTimer: ReturnType<typeof setTimeout> | undefined;

function pointInLondon([x, y]: LngLat) {
  const ring = LONDON_BOUNDARY;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** % of London a given number of res-11 cells covers. */
export const pctFromCells = (n: number) => (n / londonCells()) * 100;

/** Current revealed cells (for account sync). */
export const getCells = () => (ensureLoaded(), [...cells]);

/** London measured in res-11 cells (res-9 count × 49 children — cheap and accurate enough). */
function londonCells() {
  if (!londonCellCount) londonCellCount = polygonToCells(LONDON_BOUNDARY, 9, true).length * 49;
  return londonCellCount;
}

export function cellsAround(lat: number, lng: number, radiusM: number) {
  const out: string[] = [];
  for (const c of gridDisk(latLngToCell(lat, lng, H3_RES), RING_K)) {
    const [clat, clng] = cellToLatLng(c);
    if (distanceM([lng, lat], [clng, clat]) <= radiusM && pointInLondon([clng, clat])) out.push(c);
  }
  return out;
}

function defaultCells() {
  const [lng, lat] = CAMPUS_CENTER;
  return cellsAround(lat, lng, 150);
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(saved) && saved.length) {
      cells = new Set(saved as string[]);
    } else {
      // Migrate res-10 cells from the first build: each becomes its 7 res-11 children.
      const legacy: unknown = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "null");
      cells = new Set(Array.isArray(legacy) && legacy.length ? (legacy as string[]).flatMap((c) => cellToChildren(c, H3_RES)) : defaultCells());
    }
  } catch {
    cells = new Set(defaultCells());
  }
  recompute();
}

function recompute() {
  const count = cells.size;
  const rep = fogRepFromCells(count);
  const { rank } = rankFor(rep);
  snapshot = { count, pct: (count / londonCells()) * 100, rep, rank };
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

/** Clear fog within `radiusM` of a position. Returns the number of newly revealed cells. */
export function revealAround(lat: number, lng: number, radiusM = REVEAL_RADIUS_M) {
  ensureLoaded();
  let added = 0;
  for (const c of cellsAround(lat, lng, radiusM)) {
    if (!cells.has(c)) {
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
