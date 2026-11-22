/**
 * Player progress kept on the device: mission completions + profile.
 * Rep = fog Rep (cells cleared) + mission Rep; rank comes from total Rep.
 */
import { getSnapshot as getFogSnapshot, subscribe as subscribeFog } from "./fog";
import { RANKS, rankFor } from "./rank";
import { BADGES } from "./badges";
import { getRides, subscribeRides } from "./rides";
import { COLLECTIBLES, COLLECTIBLE_REP } from "./collectibles";
import { CLASS_RUN_REP } from "./schedule";
import { celebrate } from "./celebrate";
import { DISTRICTS, districtAt, getDistrictStats } from "./districts";
import { REGION_REP, checkInTarget, regionProgress, regionQuests } from "./regions";
import { setClaimedAreas } from "./fog";
import { onFix } from "./location";
import type { LngLat } from "./geo";
import { DAILY_REP, DAILY_SWEEP_REP, dailyDone, dailyQuests, dayKey, startOfDay, streakFrom } from "./daily";

export { rankFor };
import { MISSIONS } from "./missions";

const STORAGE_KEY = "mc.progress.v1";

export type Completion = { slug: string; at: number; rep: number; thumb?: string; reason?: string };

export const FACULTIES = [
  "Arts & Humanities",
  "Business (Ivey)",
  "Education",
  "Engineering",
  "Health Sciences",
  "Information & Media Studies",
  "Law",
  "Medicine & Dentistry",
  "Music",
  "Science",
  "Social Science",
  "Affiliate (Brescia / Huron / King's)",
] as const;

export const ACCENTS = ["#FF4F8B", "#FF8A3D", "#FFC857", "#7B2FF7", "#2EE6D6", "#F6EFFF"] as const;

/** Emblems: id → unlock rule (Rep needed or mission count). Original glyphs live in components/profile/Emblem.tsx. */
export const EMBLEMS = [
  { id: "mustang", name: "Mustang", unlock: { rep: 0 } },
  { id: "goose", name: "Goose", unlock: { rep: 0 } },
  { id: "compass", name: "Compass", unlock: { rep: 0 } },
  { id: "bolt", name: "Bolt", unlock: { rep: 0 } },
  { id: "owl", name: "Night Owl", unlock: { missions: 3 } },
  { id: "bus", name: "Transit", unlock: { missions: 5 } },
  { id: "crown", name: "Crown", unlock: { rep: 1000 } },
  { id: "skull", name: "Legend", unlock: { rep: 5000 } },
] as const;

export type EmblemId = (typeof EMBLEMS)[number]["id"];

export type Profile = {
  name: string;
  faculty: string;
  year: string;
  emblem: EmblemId;
  accent: string;
  showcase: string[]; // up to 3 mission slugs
  title: string; // an earned badge code, or ""
};

const DEFAULT_PROFILE: Profile = { name: "", faculty: "", year: "", emblem: "mustang", accent: ACCENTS[0], showcase: [], title: "" };

type Stored = {
  completions: Record<string, Completion>;
  profile: Profile;
  badges: Record<string, number>; // code → earned at
  lastRank: string | null; // last rank celebrated (null = not yet initialised)
  demoRep: number; // demo-controls only
  districts: Record<string, number>; // claimed region (neighbourhood) name → at
  visits?: Record<string, number>; // region name → first set foot in it
  checkins?: Record<string, { place: string; at: number }>; // region quest id → place checked in at
  dayStart?: { day: string; cells: number }; // fog cell count when today began (for "explore N blocks today")
  dailyDone?: Record<string, number>; // `${day}|${questId}` → done at
  activeDays?: string[]; // days with at least one daily quest done (streak)
  finds?: Record<string, number>; // collectible id → found at
  classRuns?: Record<string, number>; // `${meetingId}|${date}` → arrived on time at
};

export type ProgressSnapshot = {
  completions: Record<string, Completion>;
  profile: Profile;
  missionRep: number;
  missionCount: number;
  badges: Record<string, number>;
  demoRep: number;
  districts: Record<string, number>;
  visits: Record<string, number>;
  checkins: Record<string, { place: string; at: number }>;
  regionsClaimed: number;
  dailyDone: Record<string, number>;
  cellsToday: number;
  streak: number;
  finds: Record<string, number>;
  classRuns: Record<string, number>;
  rep: number;
  rank: string;
  nextRank: { name: string; min: number } | null;
  pct: number;
};

let data: Stored = { completions: {}, profile: DEFAULT_PROFILE, badges: {}, lastRank: null, demoRep: 0, districts: {} };
let loaded = false;
let snapshot: ProgressSnapshot | null = null;
const listeners = new Set<() => void>();

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Stored>;
      data = {
        completions: parsed.completions ?? {},
        profile: { ...DEFAULT_PROFILE, ...parsed.profile },
        badges: parsed.badges ?? {},
        lastRank: parsed.lastRank ?? null,
        demoRep: parsed.demoRep ?? 0,
        districts: parsed.districts ?? {},
        visits: parsed.visits ?? {},
        checkins: parsed.checkins ?? {},
        dayStart: parsed.dayStart,
        dailyDone: parsed.dailyDone ?? {},
        activeDays: parsed.activeDays ?? [],
        finds: parsed.finds ?? {},
        classRuns: parsed.classRuns ?? {},
      };
    }
  } catch {
    /* corrupted — start fresh */
  }
  subscribeFog(() => {
    snapshot = null;
    listeners.forEach((l) => l());
    checkMilestones();
  });
  subscribeRides(() => checkMilestones()); // bus rides feed Route 6 Regular / Every Route (also starts detection)
  // Region quest "Set foot in …": the first fix inside each region.
  onFix((fix) => {
    const region = districtAt(fix.lngLat);
    if (!region || data.visits?.[region]) return;
    data.visits = { ...(data.visits ?? {}), [region]: Date.now() };
    save();
  });
  syncClaimedFog();
  checkMilestones(true);
}

const FLAME = "M12 3c1 3.5 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2 1-3.2 2-4.2.2 1.6 1 2.6 2 2.7C11 8.6 11.3 5.6 12 3Z";

/** Claimed regions are fully revealed on the map (their fog lifts with a crisp border, like Mustang City). */
function syncClaimedFog() {
  setClaimedAreas(DISTRICTS.filter((d) => data.districts[d.name]).flatMap((d) => d.polygons));
}

/** Celebrate rank-ups and newly earned badges (once each). `silent` on first load. */
function checkMilestones(silent = false) {
  const snap = getSnapshot();
  let changed = false;

  const idx = (name: string | null) => RANKS.findIndex((r) => r.name === name);
  if (data.lastRank === null) {
    data.lastRank = snap.rank; // first run: start from the current rank, no celebration
    changed = true;
  } else if (!silent && idx(snap.rank) > idx(data.lastRank)) {
    data.lastRank = snap.rank;
    changed = true;
    celebrate({ id: `rank-${snap.rank}`, kind: "rank", title: snap.rank, subtitle: `${snap.rep.toLocaleString()} Rep` });
  }

  const r = getRides();
  const input = { completions: data.completions, pct: snap.pct, rides: r.rides, totalRoutes: r.total, classRuns: data.classRuns ?? {} };
  for (const b of BADGES) {
    if (data.badges[b.code] || !b.evaluate(input).earned) continue;
    data.badges = { ...data.badges, [b.code]: Date.now() };
    changed = true;
    if (!silent) celebrate({ id: `badge-${b.code}`, kind: "badge", title: b.name, subtitle: b.description, color: b.color, glyph: b.glyph });
  }
  // Region claims: finish CLAIM_NEEDED of a neighbourhood's four quests (lib/regions.ts) and its fog lifts.
  const stats = getDistrictStats();
  const regionInput = { visits: data.visits ?? {}, checkins: data.checkins ?? {}, completions: data.completions, finds: data.finds ?? {} };
  let claimedNow = false;
  for (const d of DISTRICTS) {
    if (data.districts[d.name] || !regionProgress(d.name, regionInput, stats).claimable) continue;
    data.districts = { ...data.districts, [d.name]: Date.now() };
    changed = true;
    claimedNow = true;
    if (!silent)
      celebrate({
        id: `district-${d.name}`,
        kind: "district",
        title: d.name,
        subtitle: `Region claimed · +${REGION_REP} Rep · ${Object.keys(data.districts).length}/${DISTRICTS.length}`,
        color: "#FFC857",
        glyph: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Zm0-8.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
      });
  }
  if (claimedNow) syncClaimedFog();

  // Daily quests + streak (lib/daily.ts).
  const day = dayKey();
  const fogCount = getFogSnapshot().count;
  if (data.dayStart?.day !== day) {
    data.dayStart = { day, cells: fogCount };
    changed = true;
  }
  const dailyInput = {
    since: startOfDay(),
    cellsToday: Math.max(0, fogCount - data.dayStart.cells),
    checkins: data.checkins ?? {},
    visits: data.visits ?? {},
    completions: data.completions,
    claims: data.districts,
  };
  const quests = dailyQuests(day);
  for (const q of quests) {
    const key = `${day}|${q.id}`;
    if (data.dailyDone?.[key] || !dailyDone(q.id, dailyInput)) continue;
    data.dailyDone = { ...(data.dailyDone ?? {}), [key]: Date.now() };
    changed = true;
    const doneToday = quests.filter((x) => data.dailyDone?.[`${day}|${x.id}`]).length;
    if (!silent)
      celebrate({
        id: `daily-${key}`,
        kind: "daily",
        title: q.title,
        subtitle: doneToday === quests.length ? `All 3 dailies done · +${DAILY_REP + DAILY_SWEEP_REP} Rep` : `Daily quest ${doneToday}/3 · +${DAILY_REP} Rep`,
        color: "#2EE6D6",
        glyph: "M5 12.5l4.5 4.5L19 7.5",
      });
    if (!(data.activeDays ?? []).includes(day)) {
      data.activeDays = [...(data.activeDays ?? []), day].slice(-120);
      const streak = streakFrom(data.activeDays);
      if (!silent && streak >= 2)
        celebrate({ id: `streak-${day}`, kind: "streak", title: `${streak}-day streak`, subtitle: "Come back tomorrow to keep it going.", color: "#FF8A3D", glyph: FLAME });
    }
  }
  if (changed) save(false);
}

function save(recheck = true) {
  snapshot = null;
  listeners.forEach((l) => l());
  if (recheck) checkMilestones();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full (thumbnails): drop the oldest thumbnails and retry once.
    const oldest = Object.values(data.completions).sort((a, b) => a.at - b.at);
    for (const c of oldest.slice(0, Math.ceil(oldest.length / 2))) delete c.thumb;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* give up silently; progress still lives in memory this session */
    }
  }
}

export function subscribe(l: () => void) {
  ensureLoaded();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getSnapshot(): ProgressSnapshot {
  ensureLoaded();
  if (!snapshot) {
    const fog = getFogSnapshot();
    const list = Object.values(data.completions);
    const missionRep = list.reduce((s, c) => s + c.rep, 0);
    const districtRep = Object.keys(data.districts).length * REGION_REP;
    const findRep = Object.keys(data.finds ?? {}).length * COLLECTIBLE_REP;
    const classRep = Object.keys(data.classRuns ?? {}).length * CLASS_RUN_REP;
    const dailyKeys = Object.keys(data.dailyDone ?? {});
    const sweptDays = Object.values(dailyKeys.reduce<Record<string, number>>((m, k) => ((m[k.split("|")[0]] = (m[k.split("|")[0]] ?? 0) + 1), m), {})).filter((n) => n >= 3).length;
    const dailyRep = dailyKeys.length * DAILY_REP + sweptDays * DAILY_SWEEP_REP;
    const rep = fog.rep + missionRep + data.demoRep + districtRep + findRep + classRep + dailyRep;
    snapshot = {
      completions: data.completions,
      profile: data.profile,
      missionRep,
      missionCount: list.length,
      badges: data.badges,
      demoRep: data.demoRep,
      districts: data.districts,
      visits: data.visits ?? {},
      checkins: data.checkins ?? {},
      regionsClaimed: Object.keys(data.districts).length,
      dailyDone: data.dailyDone ?? {},
      cellsToday: Math.max(0, fog.count - (data.dayStart?.day === dayKey() ? data.dayStart.cells : fog.count)),
      streak: streakFrom(data.activeDays ?? []),
      finds: data.finds ?? {},
      classRuns: data.classRuns ?? {},
      rep,
      pct: fog.pct,
      ...rankFor(rep),
    };
  }
  return snapshot;
}

const SERVER: ProgressSnapshot = {
  completions: {},
  profile: DEFAULT_PROFILE,
  missionRep: 0,
  missionCount: 0,
  badges: {},
  demoRep: 0,
  districts: {},
  visits: {},
  checkins: {},
  regionsClaimed: 0,
  dailyDone: {},
  cellsToday: 0,
  streak: 0,
  finds: {},
  classRuns: {},
  rep: 0,
  rank: "Frosh",
  nextRank: RANKS[1],
  pct: 0,
};
export const getServerSnapshot = () => SERVER;

export const isComplete = (slug: string) => (ensureLoaded(), !!data.completions[slug]);

/** Record a completion once. Returns the Rep awarded (0 if already done). */
export function completeMission(c: Omit<Completion, "at">) {
  ensureLoaded();
  if (data.completions[c.slug]) return 0;
  data = { ...data, completions: { ...data.completions, [c.slug]: { ...c, at: Date.now() } } };
  save();
  return c.rep;
}

export function updateProfile(patch: Partial<Profile>) {
  ensureLoaded();
  data = { ...data, profile: { ...data.profile, ...patch } };
  save();
}

export function emblemUnlocked(id: EmblemId, snap: ProgressSnapshot) {
  const e = EMBLEMS.find((x) => x.id === id);
  if (!e) return false;
  const u = e.unlock as { rep?: number; missions?: number };
  return (u.rep === undefined || snap.rep >= u.rep) && (u.missions === undefined || snap.missionCount >= u.missions);
}

export const unlockLabel = (id: EmblemId) => {
  const u = EMBLEMS.find((x) => x.id === id)?.unlock as { rep?: number; missions?: number } | undefined;
  if (!u) return "";
  if (u.missions) return `${u.missions} missions`;
  if (u.rep) return `${u.rep.toLocaleString()} Rep`;
  return "";
};

/** Dev/demo only: forget completions. */
export function resetProgress() {
  ensureLoaded();
  data = { ...data, completions: {}, demoRep: 0, finds: {}, districts: {}, visits: {}, checkins: {}, dailyDone: {}, activeDays: [], dayStart: undefined };
  syncClaimedFog();
  save();
}

/**
 * Region quest check-in: GPS-verified, you have to be standing at an accepted place.
 * Returns the place's name, or null if you're not close enough to one.
 */
export function checkInQuest(region: string, questId: string, at: LngLat): string | null {
  ensureLoaded();
  const q = regionQuests(region).find((x) => x.id === questId);
  if (!q || q.kind !== "checkin" || data.checkins?.[questId]) return null;
  const place = checkInTarget(q, region, at);
  if (!place) return null;
  data.checkins = { ...(data.checkins ?? {}), [questId]: { place: place.n, at: Date.now() } };
  save();
  return place.n;
}

/** Demo controls only: add Rep that is tracked separately and cleared by "Reset missions". */
export function addDemoRep(n: number) {
  ensureLoaded();
  data = { ...data, demoRep: data.demoRep + n };
  save();
}

export const totalMissions = MISSIONS.length;

/** Mark a hidden collectible found (once). Returns true if it's new. */
export function findCollectible(id: string) {
  ensureLoaded();
  if (data.finds?.[id] || !COLLECTIBLES.some((c) => c.id === id)) return false;
  data.finds = { ...(data.finds ?? {}), [id]: Date.now() };
  save();
  return true;
}

/** Class Run: arrived on time (once per class meeting). */
export function recordClassRun(key: string) {
  ensureLoaded();
  if (data.classRuns?.[key]) return false;
  data.classRuns = { ...(data.classRuns ?? {}), [key]: Date.now() };
  save();
  return true;
}
