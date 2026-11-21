"use client";
/**
 * Replay mode (brief → Core 6): record real GPS walks on the device and play them back through the
 * same pipeline as live GPS, so fog clears on screen at 1×/4×/16×. Judging backup + Wrapped source.
 */
import { DEMO_WALK, densify, distanceM, type LngLat } from "./geo";
import { acceptFix, onFix, setReplaying } from "./location";

const STORAGE_KEY = "mc.traces.v1";
const GAP_MS = 10 * 60 * 1000;
const MIN_MOVE_M = 5;
const MIN_INTERVAL_MS = 15_000;
const MAX_TRACES = 20;

/** [lng, lat, accuracy, msSinceStart] */
export type TracePoint = [number, number, number, number];
export type Trace = { id: string; startedAt: number; points: TracePoint[]; sample?: boolean };
export type TraceSummary = { id: string; startedAt: number; durationMs: number; distanceM: number; sample: boolean; label: string };
export type ReplayState = { playing: string | null; speed: number; progress: number };

let traces: Trace[] = [];
let loaded = false;
let current: Trace | null = null;
let lastPointAt = 0;
let state: ReplayState = { playing: null, speed: 16, progress: 0 };
let summaries: TraceSummary[] = [];
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

// ---- Sample walk: the demo campus loop at walking pace (1.4 m/s) --------------------------
const SAMPLE: Trace = (() => {
  const path = densify(DEMO_WALK, 10);
  let t = 0;
  const points: TracePoint[] = path.map((p, i) => {
    if (i > 0) t += (distanceM(path[i - 1], p) / 1.4) * 1000;
    return [p[0], p[1], 6, Math.round(t)];
  });
  return { id: "sample-campus-loop", startedAt: Date.UTC(2026, 10, 21, 15, 0), points, sample: true };
})();

function emit() {
  summaries = buildSummaries();
  listeners.forEach((l) => l());
}

function buildSummaries(): TraceSummary[] {
  const all = [...traces].sort((a, b) => b.startedAt - a.startedAt).concat(SAMPLE);
  return all.map((t) => {
    let d = 0;
    for (let i = 1; i < t.points.length; i++) d += distanceM([t.points[i - 1][0], t.points[i - 1][1]], [t.points[i][0], t.points[i][1]]);
    return {
      id: t.id,
      startedAt: t.startedAt,
      durationMs: t.points.at(-1)?.[3] ?? 0,
      distanceM: d,
      sample: !!t.sample,
      label: t.sample
        ? "Campus loop (sample)"
        : new Date(t.startedAt).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    };
  });
}

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const keep = traces.filter((t) => t.points.length >= 3).slice(-MAX_TRACES);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keep));
    } catch {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(keep.slice(-5)));
      } catch {
        /* storage unavailable — traces live in memory this session */
      }
    }
  }, 1000);
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (Array.isArray(saved)) traces = saved as Trace[];
  } catch {
    traces = [];
  }
  // Record real GPS only (never demo or replay fixes).
  onFix((fix) => {
    if (fix.source !== "gps" || state.playing) return;
    const now = fix.ts;
    if (!current || now - lastPointAt > GAP_MS) {
      current = { id: `t${now}`, startedAt: now, points: [] };
      traces.push(current);
    }
    const last = current.points.at(-1);
    const moved = last ? distanceM([last[0], last[1]], fix.lngLat) : Infinity;
    if (moved < MIN_MOVE_M && now - lastPointAt < MIN_INTERVAL_MS) return;
    current.points.push([fix.lngLat[0], fix.lngLat[1], Math.round(fix.accuracy), now - current.startedAt]);
    lastPointAt = now;
    persist();
    emit();
  });
  summaries = buildSummaries();
}

export function subscribeReplay(l: () => void) {
  ensureLoaded();
  listeners.add(l);
  return () => listeners.delete(l);
}
export const getReplayState = () => (ensureLoaded(), state);
export const getTraceSummaries = () => (ensureLoaded(), summaries);
const SERVER_STATE: ReplayState = { playing: null, speed: 16, progress: 0 };
const SERVER_SUMMARIES: TraceSummary[] = [];
export const getServerReplayState = () => SERVER_STATE;
export const getServerTraceSummaries = () => SERVER_SUMMARIES;

const findTrace = (id: string) => (id === SAMPLE.id ? SAMPLE : traces.find((t) => t.id === id));

/** Play a trace through the live-GPS pipeline. Starting a new replay stops the current one. */
export function playTrace(id: string, speed = 16) {
  ensureLoaded();
  stopReplay();
  const trace = findTrace(id);
  if (!trace || trace.points.length < 2) return;
  setReplaying(true);
  state = { playing: id, speed, progress: 0 };
  emit();

  let i = 0;
  const step = () => {
    const [lng, lat, acc, t] = trace.points[i];
    // Historical timestamps keep the speed check honest at any playback speed.
    acceptFix([lng, lat] as LngLat, { accuracy: acc, ts: trace.startedAt + t, source: "replay" });
    state = { ...state, progress: (i + 1) / trace.points.length };
    emit();
    i++;
    if (i >= trace.points.length) return stopReplay();
    const wait = (trace.points[i][3] - t) / speed;
    timer = setTimeout(step, Math.max(16, Math.min(wait, 4000)));
  };
  step();
}

export function stopReplay() {
  clearTimeout(timer);
  if (!state.playing) return;
  setReplaying(false);
  state = { ...state, playing: null };
  emit();
}

export const SAMPLE_TRACE_ID = SAMPLE.id;
