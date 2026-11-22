/**
 * Daily quests + streaks: a reason to open the app every day. Three quests a day, the same for everyone
 * (seeded by the date): two quick ones and one stretch. Doing at least one keeps your streak alive.
 * Pure functions over stored progress; lib/progress.ts marks completions, awards Rep and tracks the streak.
 */

export const DAILY_REP = 20;
export const DAILY_SWEEP_REP = 50; // all three in one day

export type DailyId = "checkin" | "explore" | "newRegion" | "goose" | "claim" | "explore2";
export type DailyQuest = { id: DailyId; title: string; detail: string; stretch?: boolean };

const EASY: DailyQuest[] = [
  { id: "checkin", title: "Check in somewhere local", detail: "Any café, restaurant, shop or landmark on a region quest board." },
  { id: "explore", title: "Explore 10 new blocks", detail: "Walk somewhere you haven't been yet." },
  { id: "newRegion", title: "Set foot in a new region", detail: "Cross into a neighbourhood you've never visited." },
  { id: "goose", title: "Finish a Goose job", detail: "Any mission from The Goose." },
];
const STRETCH: DailyQuest[] = [
  { id: "claim", title: "Claim a region", detail: "Finish 3 quests in one neighbourhood.", stretch: true },
  { id: "explore2", title: "Explore 25 new blocks", detail: "A proper wander: take the long way home.", stretch: true },
];

/** Local calendar date, e.g. "2026-11-22" (days roll over at local midnight). */
export function dayKey(t = Date.now()) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function startOfDay(t = Date.now()) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
export const msToMidnight = (t = Date.now()) => startOfDay(t) + 86_400_000 - t;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Today's three quests: two quick ones + one stretch, deterministic per date. */
export function dailyQuests(day = dayKey()): DailyQuest[] {
  const h = hash(day);
  const a = h % EASY.length;
  const b = (a + 1 + ((h >>> 8) % (EASY.length - 1))) % EASY.length;
  return [EASY[a], EASY[b], STRETCH[(h >>> 16) % STRETCH.length]];
}

export type DailyInput = {
  since: number; // start of today (ms)
  cellsToday: number; // fog cells first cleared today
  checkins: Record<string, { at: number }>;
  visits: Record<string, number>;
  completions: Record<string, { at: number }>;
  claims: Record<string, number>;
};

export function dailyDone(id: DailyId, i: DailyInput): boolean {
  const today = (t: number) => t >= i.since;
  switch (id) {
    case "checkin":
      return Object.values(i.checkins).some((c) => today(c.at));
    case "explore":
      return i.cellsToday >= 70; // ~7 cells per block
    case "explore2":
      return i.cellsToday >= 175;
    case "newRegion":
      return Object.values(i.visits).some(today);
    case "goose":
      return Object.values(i.completions).some((c) => today(c.at));
    case "claim":
      return Object.values(i.claims).some(today);
  }
}

/** Consecutive active days ending today (or yesterday, if today has nothing yet: the streak is still alive). */
export function streakFrom(activeDays: string[], now = Date.now()) {
  const set = new Set(activeDays);
  let t = set.has(dayKey(now)) ? now : now - 86_400_000;
  let n = 0;
  while (set.has(dayKey(t))) {
    n++;
    t -= 86_400_000;
  }
  return n;
}
