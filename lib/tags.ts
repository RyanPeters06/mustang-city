"use client";
/**
 * Geo-pinned tags as the player sees them.
 * - "server" mode (signed in + DB): /api/tags returns only tags in cells the player has revealed.
 * - "local" mode (signed out / no DB): the player's own device-only tags + clearly labelled demo tags,
 *   each shown only once the local fog over its cell is cleared.
 */
import { latLngToCell } from "h3-js";
import { H3_RES, isRevealedAt, subscribe as subscribeFog } from "./fog";
import type { LngLat } from "./geo";
import type { Tag } from "./tagRules";

export type TagsState = { mode: "loading" | "server" | "local"; tags: Tag[] };

const LOCAL_KEY = "mc.tags.v1";
const VOTES_KEY = "mc.tagvotes.v1";

const DEMO: Omit<Tag, "cell" | "mine" | "voted" | "kind">[] = [
  { id: "demo:1", lngLat: [-81.2726, 43.0092], note: "Quietest bench on this path. You're welcome.", photo: null, author: "demo.maya", votes: 12, createdAt: Date.UTC(2026, 10, 14) },
  { id: "demo:2", lngLat: [-81.2709, 43.011], note: "Geese patrol here at lunch. Walk with purpose. Do not make eye contact.", photo: null, author: "demo.dev", votes: 31, createdAt: Date.UTC(2026, 10, 17) },
  { id: "demo:3", lngLat: [-81.2755, 43.0116], note: "Sunset from right here hits different. Trust.", photo: null, author: "demo.jules", votes: 8, createdAt: Date.UTC(2026, 10, 19) },
];

let state: TagsState = { mode: "loading", tags: [] };
const SERVER_STATE: TagsState = { mode: "loading", tags: [] };
const listeners = new Set<() => void>();
let started = false;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

function set(next: TagsState) {
  state = next;
  listeners.forEach((l) => l());
}

export const getTags = () => state;
export const getServerTags = () => SERVER_STATE;
export function subscribeTags(l: () => void) {
  start();
  listeners.add(l);
  return () => listeners.delete(l);
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / private mode: the tag still shows this session */
  }
}

function localTags(): Tag[] {
  const voted = new Set(readJson<string[]>(VOTES_KEY, []));
  const mine = readJson<Tag[]>(LOCAL_KEY, []);
  const demo: Tag[] = DEMO.map((d) => {
    const v = voted.has(d.id);
    return { ...d, cell: latLngToCell(d.lngLat[1], d.lngLat[0], H3_RES), mine: false, voted: v, votes: d.votes + (v ? 1 : 0), kind: "demo" };
  });
  return [...mine, ...demo.filter((t) => isRevealedAt(t.lngLat[1], t.lngLat[0]))];
}

async function fetchServer(): Promise<boolean> {
  try {
    const res = await fetch("/api/tags", { cache: "no-store" });
    if (!res.ok) return false;
    const { tags } = (await res.json()) as { tags: Tag[] };
    set({ mode: "server", tags });
    return true;
  } catch {
    return false;
  }
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  void fetchServer().then((ok) => {
    if (!ok) set({ mode: "local", tags: localTags() });
  });
  // New reveals can unlock tags. Local: recompute now. Server: wait for the account sync (15 s) to land first.
  subscribeFog(() => {
    if (state.mode === "local") return set({ mode: "local", tags: localTags() });
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => void fetchServer(), 20_000);
  });
}

export type CreateResult = { ok: true; tag: Tag } | { ok: false; message: string };

/** Pin a tag at the player's fix. */
export async function createTag(fix: { lngLat: LngLat; accuracy: number }, note: string, photo?: string): Promise<CreateResult> {
  const [lng, lat] = fix.lngLat;
  if (state.mode === "server") {
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lat, lng, accuracy: fix.accuracy, note, photo }),
      });
      const json = (await res.json()) as { tag?: Tag; message?: string };
      if (!res.ok || !json.tag) return { ok: false, message: json.message ?? "Couldn't pin that. Try again." };
      set({ mode: "server", tags: [json.tag, ...state.tags] });
      return { ok: true, tag: json.tag };
    } catch {
      return { ok: false, message: "You're offline. Try again when you have signal." };
    }
  }
  const tag: Tag = {
    id: `local:${Date.now().toString(36)}`,
    cell: latLngToCell(lat, lng, H3_RES),
    lngLat: [lng, lat],
    note: note.trim(),
    photo: photo ?? null,
    author: "you",
    mine: true,
    votes: 0,
    voted: false,
    createdAt: Date.now(),
    kind: "local",
  };
  writeJson(LOCAL_KEY, [tag, ...readJson<Tag[]>(LOCAL_KEY, [])].slice(0, 50));
  set({ mode: "local", tags: localTags() });
  return { ok: true, tag };
}

/** Toggle an upvote. Server tags give the author +10 Rep; demo tags only change on this device. */
export async function toggleVote(id: string): Promise<string | null> {
  const tag = state.tags.find((t) => t.id === id);
  if (!tag || tag.mine) return null;
  const on = !tag.voted;
  const patch = (votes: number, voted: boolean) =>
    set({ ...state, tags: state.tags.map((t) => (t.id === id ? { ...t, votes, voted } : t)) });

  if (tag.kind !== "server") {
    const voted = new Set(readJson<string[]>(VOTES_KEY, []));
    if (on) voted.add(id);
    else voted.delete(id);
    writeJson(VOTES_KEY, [...voted]);
    patch(tag.votes + (on ? 1 : -1), on);
    return null;
  }
  patch(tag.votes + (on ? 1 : -1), on); // optimistic
  try {
    const res = await fetch(`/api/tags/${id}/vote`, { method: on ? "POST" : "DELETE" });
    const json = (await res.json()) as { votes?: number; voted?: boolean; message?: string };
    if (!res.ok) {
      patch(tag.votes, tag.voted);
      return json.message ?? "Couldn't vote. Try again.";
    }
    patch(json.votes ?? tag.votes, json.voted ?? on);
    return null;
  } catch {
    patch(tag.votes, tag.voted);
    return "You're offline.";
  }
}

/** Delete one of your own tags (device-only or on the server). */
export async function deleteTag(id: string): Promise<string | null> {
  const tag = state.tags.find((t) => t.id === id);
  if (!tag?.mine) return null;
  if (tag.kind === "server") {
    try {
      const res = await fetch(`/api/tags?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) return ((await res.json()) as { message?: string }).message ?? "Couldn't delete it.";
    } catch {
      return "You're offline.";
    }
    set({ ...state, tags: state.tags.filter((t) => t.id !== id) });
    return null;
  }
  writeJson(LOCAL_KEY, readJson<Tag[]>(LOCAL_KEY, []).filter((t) => t.id !== id));
  set({ mode: "local", tags: localTags() });
  return null;
}
