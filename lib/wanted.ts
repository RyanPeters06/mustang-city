/**
 * Wanted level for curiosity (IDEAS §1): 0–5 stars that climb while you're actively uncovering the city and cool
 * off when you stop. Heat comes from new fog cleared, check-ins, side quests and claims; it decays with a
 * 4-minute half-life. Purely cosmetic: a genre-flavoured "you're on a roll" meter on the HUD.
 */
import { getSnapshot as getFog, subscribe as subscribeFog } from "./fog";
import { getSnapshot as getProgress, subscribe as subscribeProgress } from "./progress";

const HALF_LIFE_MS = 4 * 60_000;
const THRESHOLDS = [8, 35, 80, 150, 240]; // heat needed for 1..5 stars

let heat = 0;
let at = 0;
let stars = 0;
let wired = false;
let lastCells = -1;
let lastEvents = -1;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

const decayed = (now = Date.now()) => heat * Math.pow(0.5, (now - at) / HALF_LIFE_MS);

function recompute() {
  const h = decayed();
  const s = THRESHOLDS.filter((t) => h >= t).length;
  if (s !== stars) {
    stars = s;
    listeners.forEach((l) => l());
  }
  if (h < 1 && timer) {
    clearInterval(timer);
    timer = undefined;
  }
}

/** Add heat (e.g. +1 per new cell, +40 per check-in). */
export function addHeat(n: number) {
  const now = Date.now();
  heat = decayed(now) + n;
  at = now;
  recompute();
  timer ??= setInterval(recompute, 5000);
}

function wire() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  subscribeFog(() => {
    const c = getFog().count;
    if (lastCells >= 0 && c > lastCells) addHeat(c - lastCells);
    lastCells = c;
  });
  subscribeProgress(() => {
    const p = getProgress();
    const events = Object.keys(p.checkins).length * 40 + Object.keys(p.sideDone).length * 40 + p.regionsClaimed * 80 + p.missionCount * 60;
    if (lastEvents >= 0 && events > lastEvents) addHeat(events - lastEvents);
    lastEvents = events;
  });
  lastCells = getFog().count;
  const p = getProgress();
  lastEvents = Object.keys(p.checkins).length * 40 + Object.keys(p.sideDone).length * 40 + p.regionsClaimed * 80 + p.missionCount * 60;
}

export function getWanted() {
  wire();
  return stars;
}
export const getServerWanted = () => 0;
export function subscribeWanted(l: () => void) {
  wire();
  listeners.add(l);
  return () => listeners.delete(l);
}
