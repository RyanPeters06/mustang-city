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

/** WHO guideline: adults should get at least 150 minutes of moderate activity (e.g. brisk walking) a week. */
export const WEEKLY_ACTIVE_GOAL_MIN = 150;
/** Rough average stride: ~1,300 steps per km. Shown with "≈" since we measure distance, not steps. */
const STEPS_PER_KM = 1300;
const DAY_MS = 24 * 3600 * 1000;

export type WalkStats = {
  kmTotal: number;
  kmWeek: number;
  newPlacesWeek: number;
  walksWeek: number;
  activeMinWeek: number;
  stepsWeek: number;
  streakDays: number;
};

const dayKey = (ms: number) => new Date(ms).toDateString();

/** Consecutive days (ending today, or yesterday if today has no walk yet) with at least one recorded walk. */
function streak(traces: Trace[], now: number) {
  const days = new Set(traces.map((t) => dayKey(t.startedAt)));
  let d = days.has(dayKey(now)) ? now : now - DAY_MS;
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d -= DAY_MS;
  }
  return n;
}

/** km walked (all time + this week), active minutes, streak, and explored cells first reached on this week's walks. */
export function walkStats(now = Date.now()): WalkStats {
  const traces = getRecordedTraces();
  const all = new Set(getCells());
  const older = new Set<string>();
  const thisWeek = new Set<string>();
  let kmTotal = 0;
  let kmWeek = 0;
  let walksWeek = 0;
  let activeMsWeek = 0;
  for (const t of traces) {
    const km = traceKm(t);
    kmTotal += km;
    const recent = now - t.startedAt < WEEK_MS;
    if (recent) {
      kmWeek += km;
      walksWeek++;
      activeMsWeek += t.points.at(-1)?.[3] ?? 0; // point[3] = ms since the walk started
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
  return {
    kmTotal,
    kmWeek,
    newPlacesWeek: Math.round(thisWeek.size / 7),
    walksWeek,
    activeMinWeek: Math.round(activeMsWeek / 60000),
    stepsWeek: Math.round((kmWeek * STEPS_PER_KM) / 100) * 100,
    streakDays: streak(traces, now),
  };
}
