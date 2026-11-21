/**
 * Player progress kept on the device: mission completions + profile.
 * Rep = fog Rep (cells cleared) + mission Rep; rank comes from total Rep.
 */
import { getSnapshot as getFogSnapshot, subscribe as subscribeFog, RANKS } from "./fog";
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
};

const DEFAULT_PROFILE: Profile = { name: "", faculty: "", year: "", emblem: "mustang", accent: ACCENTS[0], showcase: [] };

type Stored = { completions: Record<string, Completion>; profile: Profile };

export type ProgressSnapshot = {
  completions: Record<string, Completion>;
  profile: Profile;
  missionRep: number;
  missionCount: number;
  rep: number;
  rank: string;
  nextRank: { name: string; min: number } | null;
  pct: number;
};

let data: Stored = { completions: {}, profile: DEFAULT_PROFILE };
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
      data = { completions: parsed.completions ?? {}, profile: { ...DEFAULT_PROFILE, ...parsed.profile } };
    }
  } catch {
    /* corrupted — start fresh */
  }
  subscribeFog(() => {
    snapshot = null;
    listeners.forEach((l) => l());
  });
}

function save() {
  snapshot = null;
  listeners.forEach((l) => l());
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

export function rankFor(rep: number) {
  const idx = [...RANKS].map((r) => rep >= r.min).lastIndexOf(true);
  return { rank: RANKS[Math.max(0, idx)].name, nextRank: RANKS[idx + 1] ?? null };
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
    const rep = fog.rep + missionRep;
    snapshot = {
      completions: data.completions,
      profile: data.profile,
      missionRep,
      missionCount: list.length,
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
  data = { ...data, completions: {} };
  save();
}

export const totalMissions = MISSIONS.length;
