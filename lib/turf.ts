"use client";
/** Faculty turf from /api/turf (refreshed every 5 min). Demo panel can switch to clearly labelled sample turf. */
import type { TurfRow } from "@/app/api/turf/route";
import { DISTRICTS } from "./districts";
import { FACULTIES } from "./progress";

export type TurfState = { status: "loading" | "live" | "unavailable" | "sample"; rows: TurfRow[] };
let state: TurfState = { status: "loading", rows: [] };
const SERVER: TurfState = state;
const listeners = new Set<() => void>();
let started = false;
let sample = false;
let live: TurfState = state;

const emit = () => listeners.forEach((l) => l());
export const getTurf = () => state;
export const getServerTurf = () => SERVER;
export function subscribeTurf(l: () => void) {
  start();
  listeners.add(l);
  return () => listeners.delete(l);
}

async function load() {
  try {
    const res = await fetch("/api/turf");
    const j = (await res.json()) as { rows: TurfRow[] };
    live = { status: res.ok ? "live" : "unavailable", rows: j.rows ?? [] };
  } catch {
    live = { status: "unavailable", rows: [] };
  }
  if (!sample) {
    state = live;
    emit();
  }
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  void load();
  setInterval(() => void load(), 5 * 60_000);
}

/** Demo only: deterministic sample turf so the colours can be shown without accounts. */
export function setSampleTurf(on: boolean) {
  sample = on;
  if (on) {
    const rows = DISTRICTS.map((d, i) => {
      let h = 0;
      for (const ch of d.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      return { district: d.name, faculty: FACULTIES[(h + i) % FACULTIES.length], cells: 0, share: 0.3 + (h % 40) / 100 };
    });
    state = { status: "sample", rows };
  } else state = live;
  emit();
}
export const isSampleTurf = () => sample;
