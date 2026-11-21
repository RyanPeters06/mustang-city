"use client";
/**
 * Walking stats from recorded walks (brief → Sun Life health track: "km walked" and "new places this week").
 * Only real GPS walks count (replay recorder ignores demo/replay fixes).
 */
import { getRecordedTraces, type Trace } from "./replay";
import { cellsAround, getCells } from "./fog";

const WEEK_MS = 7 * 24 * 3600 * 1000;

function traceKm(t: Trace) {
  let m = 0;
  for (let i = 1; i < t.points.length; i++) {
    const [plng, plat] = t.points[i - 1];
    const [lng, lat] = t.points[i];
    m += Math.hypot((lng - plng) * 111320 * Math.cos((lat * Math.PI) / 180), (lat - plat) * 111320);
  }
  return m / 1000;
}

export type WalkStats = { kmTotal: number; kmWeek: number; newPlacesWeek: number; walksWeek: number };

/** km walked (all time + this week) and explored cells first reached on this week's walks. */
export function walkStats(now = Date.now()): WalkStats {
  const traces = getRecordedTraces();
  const all = new Set(getCells());
  const older = new Set<string>();
  const thisWeek = new Set<string>();
  let kmTotal = 0;
  let kmWeek = 0;
  let walksWeek = 0;
  for (const t of traces) {
    const km = traceKm(t);
    kmTotal += km;
    const recent = now - t.startedAt < WEEK_MS;
    if (recent) {
      kmWeek += km;
      walksWeek++;
    }
    for (const [lng, lat] of t.points) {
      for (const c of cellsAround(lat, lng, 100)) {
        if (!all.has(c)) continue;
        if (recent) {
          if (!older.has(c)) thisWeek.add(c);
        } else older.add(c);
      }
    }
  }
  // ~7 res-11 cells ≈ one city block-sized "place"
  return { kmTotal, kmWeek, newPlacesWeek: Math.round(thisWeek.size / 7), walksWeek };
}
