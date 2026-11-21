"use client";
/**
 * Fog decay (brief → revealed_cells.last_visited_at): cells you haven't been back to in 6 months fade under a
 * haze on the map. They stay explored (% and Rep never drop) — revisiting clears the haze. Day stamps per cell
 * live on the device.
 */
import { cellsAround, getCells, subscribe as subscribeFog } from "./fog";
import { onFix } from "./location";

const KEY = "mc.cellAge.v1";
export const DECAY_DAYS = 182;
const today = () => Math.floor(Date.now() / 86_400_000);

let stamps: Record<string, number> = {};
let loaded = false;
let started = false;
let stale: string[] = [];
let staleFor = -1;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    stamps = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, number>;
  } catch {
    stamps = {};
  }
  // Cells revealed before decay existed start fresh today.
  const t = today();
  for (const c of getCells()) if (!(c in stamps)) stamps[c] = t;
  persist();
}

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(stamps));
    } catch {
      /* ignore */
    }
  }, 800);
}

function emit() {
  staleFor = -1;
  listeners.forEach((l) => l());
}

export function getStaleCells(): string[] {
  load();
  const t = today();
  if (staleFor === t) return stale;
  stale = Object.entries(stamps)
    .filter(([, d]) => t - d > DECAY_DAYS)
    .map(([c]) => c);
  staleFor = t;
  return stale;
}

export function subscribeFogAge(l: () => void) {
  load();
  start();
  listeners.add(l);
  return () => listeners.delete(l);
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  onFix((fix) => {
    if (fix.source === "replay" || fix.accuracy > 50) return;
    const t = today();
    let refreshed = false;
    for (const c of cellsAround(fix.lngLat[1], fix.lngLat[0], 100)) {
      if (stamps[c] !== undefined && t - stamps[c] > DECAY_DAYS) refreshed = true;
      stamps[c] = t;
    }
    persist();
    if (refreshed) emit();
  });
  subscribeFog(() => {
    const t = today();
    for (const c of getCells()) if (!(c in stamps)) stamps[c] = t;
    persist();
  });
}

/** Demo only: pretend every cell was last visited `days` ago. */
export function ageAllCells(days: number) {
  load();
  const t = today() - days;
  for (const c of Object.keys(stamps)) stamps[c] = t;
  persist();
  emit();
}
