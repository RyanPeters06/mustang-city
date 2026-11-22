/**
 * Fog of war: revealed H3 cells, persisted on the device, rendered as ONE polygon
 * (London boundary with explored holes) — never thousands of hexes (Constitution V).
 *
 * Resolution 11 (~25 m cells) so the cleared area around the player reads as a circle:
 * every cell whose centre lies within REVEAL_RADIUS_M of an accepted fix is revealed.
 */
import { cellToChildren, cellToLatLng, cellsToMultiPolygon, gridDisk, latLngToCell, polygonToCells } from "h3-js";
import type { Feature, FeatureCollection, MultiLineString, Polygon } from "geojson";
import { CAMPUS_CENTER, CAMPUS_RING, LONDON_BOUNDARY, distanceM, type LngLat } from "./geo";
import { fogRepFromCells, rankFor } from "./rank";
import polygonClipping from "polygon-clipping";

/**
 * Mustang City (Western's real campus boundary, OSM) is always explored. Its cells are revealed for
 * drawing/visibility but never counted toward Rep, % explored, districts or account sync — you didn't walk them.
 */
let campusCells: Set<string> | null = null;
const getCampusCells = () => (campusCells ??= new Set(polygonToCells([CAMPUS_RING], H3_RES, true)));
export const inCampusArea = (lat: number, lng: number) => getCampusCells().has(latLngToCell(lat, lng, H3_RES));

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
  const count = cells.size; // player-revealed only (campus cells live in their own set)
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

/** Reveal many positions with a single change notification (demo + bulk imports). */
export function revealMany(points: [number, number][], radiusM = REVEAL_RADIUS_M) {
  ensureLoaded();
  let added = 0;
  for (const [lng, lat] of points) {
    for (const c of cellsAround(lat, lng, radiusM)) {
      if (!cells.has(c)) {
        cells.add(c);
        added++;
      }
    }
  }
  if (added) changed();
  return added;
}

export function isRevealedAt(lat: number, lng: number) {
  ensureLoaded();
  const c = latLngToCell(lat, lng, H3_RES);
  return cells.has(c) || getCampusCells().has(c);
}

export function resetFog() {
  ensureLoaded();
  cells = new Set(defaultCells());
  changed();
}

/** Build the fog layer data and the soft-edge lines from the revealed cells. */
/**
 * Chaikin corner-cutting on a closed ring: turns the stair-stepped hexagon outline into a smooth,
 * organic shape (each pass replaces every corner with two points at 1/4 and 3/4 along its edges).
 * Rings stay closed; area shrinks by well under a cell's width, so reveal accuracy is unchanged in practice.
 */
function smoothRing(ring: LngLat[], passes = 2): LngLat[] {
  let pts = ring.slice(0, -1);
  if (pts.length < 4) return ring;
  for (let k = 0; k < passes; k++) {
    const next: LngLat[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    pts = next;
  }
  return [...pts, pts[0]];
}

/** Metres from p to the campus boundary line. */
function distToCampusEdge([x, y]: LngLat) {
  const k = Math.cos((y * Math.PI) / 180);
  let best = Infinity;
  for (let i = 1; i < CAMPUS_RING.length; i++) {
    const [ax, ay] = CAMPUS_RING[i - 1];
    const [bx, by] = CAMPUS_RING[i];
    const dx = (bx - ax) * k, dy = by - ay;
    const t = dx || dy ? Math.max(0, Math.min(1, (((x - ax) * k) * dx + (y - ay) * dy) / (dx * dx + dy * dy))) : 0;
    best = Math.min(best, Math.hypot((x - ax) * k - t * dx, y - ay - t * dy) * 111320);
  }
  return best;
}
/** Split rings into polylines, dropping segments that run along the campus border (kept crisp). */
function offCampusRuns(rings: LngLat[][]): LngLat[][] {
  const runs: LngLat[][] = [];
  for (const r of rings) {
    let run: LngLat[] = [];
    for (let i = 1; i < r.length; i++) {
      const mid: LngLat = [(r[i - 1][0] + r[i][0]) / 2, (r[i - 1][1] + r[i][1]) / 2];
      if (distToCampusEdge(mid) < 1.5) {
        if (run.length > 1) runs.push(run);
        run = [];
        continue;
      }
      if (!run.length) run.push(r[i - 1]);
      run.push(r[i]);
    }
    if (run.length > 1) runs.push(run);
  }
  return runs;
}

/** Claimed regions (lib/regions.ts): revealed in full with a crisp border. Polygons are [outer, ...holes]. */
let claimed: LngLat[][][] = [];
export function setClaimedAreas(polys: LngLat[][][]) {
  claimed = polys;
  listeners.forEach((l) => l()); // redraw only; claimed land isn't stored as cells (no Rep/% inflation)
}

export function buildFog(): { fog: FeatureCollection<Polygon>; edges: Feature<MultiLineString> } {
  ensureLoaded();
  // Player-walked area: hexagons smoothed into soft blobs.
  const player = (cells.size ? cellsToMultiPolygon([...cells], true) : []).map((region) =>
    (region as LngLat[][]).map((r) => smoothRing(r)),
  );
  // Revealed = player blobs ∪ Mustang City (exact, sharp campus boundary).
  const campus = (claimed.length ? polygonClipping.union([[CAMPUS_RING]] as never, ...(claimed.map((p) => [p]) as never[])) : [[CAMPUS_RING]]) as LngLat[][][];
  const revealed = (player.length ? polygonClipping.union(campus as never, player as never) : campus) as LngLat[][][];
  // Soft fog edge only where the player walked outside campus; the campus border stays crisp.
  const softEdges = (player.length ? polygonClipping.difference(player as never, campus as never) : []) as LngLat[][][];

  const holes: LngLat[][] = [];
  const islands: Feature<Polygon>[] = [];
  for (const [outer, ...inner] of revealed) {
    holes.push(outer);
    for (const loop of inner) islands.push({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [loop] } });
  }
  return {
    fog: {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [LONDON_BOUNDARY, ...holes] } },
        ...islands,
      ],
    },
    edges: { type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: offCampusRuns(softEdges.flat()) } },
  };
}
