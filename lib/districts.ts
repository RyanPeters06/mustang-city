/**
 * Neighbourhoods = the City of London's 42 official Planning Districts
 * (City of London Open Data, "Planning Districts", Open Government Licence – City of London).
 * A district unlocks when UNLOCK_SHARE of its cells are explored.
 */
import { cellToLatLng, polygonToCells } from "h3-js";
import raw from "./data/districts.json";
import { getCells, getSnapshot as getFogSnapshot, subscribe as subscribeFog } from "./fog";
import type { LngLat } from "./geo";

export const UNLOCK_SHARE = 0.3;
export const DISTRICT_REP = 50;

type Raw = { name: string; info: string | null; label: LngLat; polygons: LngLat[][][] };
export type District = Raw & { bbox: [number, number, number, number] };
export type DistrictStat = { name: string; have: number; total: number; pct: number; eligible: boolean };

export const DISTRICTS: District[] = (raw as Raw[]).map((d) => {
  let [w, s, e, n] = [180, 90, -180, -90];
  for (const poly of d.polygons) for (const [x, y] of poly[0]) [w, s, e, n] = [Math.min(w, x), Math.min(s, y), Math.max(e, x), Math.max(n, y)];
  return { ...d, bbox: [w, s, e, n] };
});

function inRing([x, y]: LngLat, ring: LngLat[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inDistrict(p: LngLat, d: District) {
  const [w, s, e, n] = d.bbox;
  if (p[0] < w || p[0] > e || p[1] < s || p[1] > n) return false;
  return d.polygons.some((poly) => inRing(p, poly[0]) && !poly.slice(1).some((hole) => inRing(p, hole)));
}

/** Index of the district containing a point, or -1. */
export function districtIndexAt(p: LngLat) {
  return DISTRICTS.findIndex((d) => inDistrict(p, d));
}
export const districtAt = (p: LngLat) => DISTRICTS[districtIndexAt(p)]?.name ?? null;

// Size of each district in res-11 cells (res-9 count × 49), computed once on first use.
let totals: number[] | null = null;
const totalCells = () =>
  (totals ??= DISTRICTS.map((d) => d.polygons.reduce((s, poly) => s + polygonToCells(poly, 9, true).length * 49, 0) || 1));

const cellDistrict = new Map<string, number>();
let stats: DistrictStat[] = [];
let computedFor = -1; // fog cell count the stats were computed for
let wired = false;
const listeners = new Set<() => void>();

function recompute() {
  const counts = new Array(DISTRICTS.length).fill(0);
  for (const c of getCells()) {
    let idx = cellDistrict.get(c);
    if (idx === undefined) {
      const [lat, lng] = cellToLatLng(c);
      idx = districtIndexAt([lng, lat]);
      cellDistrict.set(c, idx);
    }
    if (idx >= 0) counts[idx]++;
  }
  const t = totalCells();
  stats = DISTRICTS.map((d, i) => {
    const pct = Math.min(1, counts[i] / t[i]);
    return { name: d.name, have: counts[i], total: t[i], pct, eligible: pct >= UNLOCK_SHARE };
  });
}

function wire() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  subscribeFog(() => listeners.forEach((l) => l()));
}

export function getDistrictStats(): DistrictStat[] {
  wire();
  // Keyed on the fog's cell count (cells are only ever added), so callers never see stale stats
  // regardless of listener order.
  const count = getFogSnapshot().count;
  if (count !== computedFor) {
    recompute();
    computedFor = count;
  }
  return stats;
}

export function subscribeDistricts(l: () => void) {
  wire();
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Demo helper: points every ~150 m inside a district, for revealing a chunk of it. */
export function districtSamplePoints(name: string, share = 0.33, origin?: LngLat): LngLat[] {
  const d = DISTRICTS.find((x) => x.name === name);
  if (!d) return [];
  const [w, s, e, n] = d.bbox;
  const pts: LngLat[] = [];
  const dLat = 150 / 111320;
  const dLng = 150 / (111320 * Math.cos((((s + n) / 2) * Math.PI) / 180));
  for (let y = s; y <= n; y += dLat) for (let x = w; x <= e; x += dLng) if (inDistrict([x, y], d)) pts.push([x, y]);
  // Take a contiguous-looking slice growing out from `origin` (default: the label point).
  const [ox, oy] = origin ?? d.label;
  pts.sort((a, b) => Math.hypot(a[0] - ox, a[1] - oy) - Math.hypot(b[0] - ox, b[1] - oy));
  return pts.slice(0, Math.ceil(pts.length * share) + 2);
}
