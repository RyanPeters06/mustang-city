/**
 * Region side quests: three light, varied quests per neighbourhood so every part of the map has something to do.
 * They're pinned to real spots (OpenStreetMap places, LTC stops) and give Rep, but claiming a region still runs on
 * its four core quests (lib/regions.ts). Deterministic per region, so friends see the same board.
 */
import ltc from "./data/ltc.json";
import { DISTRICTS, districtAt } from "./districts";
import { PLACES, type Place } from "./regions";
import { distanceM, type LngLat } from "./geo";

export const SIDE_REP = 40;

export type SideKind = "photo" | "bus" | "night" | "trivia" | "crawl" | "crew" | "tag";
export type SideQuest = {
  id: string;
  region: string;
  kind: SideKind;
  title: string;
  detail: string;
  at: LngLat;
  radius: number;
  place?: string;
  trivia?: { q: string; options: string[]; answer: number };
};

// General Forest State / London trivia (well-known facts only).
const TRIVIA: NonNullable<SideQuest["trivia"]>[] = [
  { q: "Which river runs through London, Ontario?", options: ["The Thames", "The Grand", "The St. Clair"], answer: 0 },
  { q: "What's London's long-standing nickname?", options: ["The Forest City", "The Steel City", "The Royal City"], answer: 0 },
  { q: "Who runs the city's buses?", options: ["London Transit (LTC)", "GO Transit", "TTC"], answer: 0 },
  { q: "The two branches of the Thames meet at…", options: ["The Forks", "The Narrows", "The Falls"], answer: 0 },
];

type Stop = { id: string; name: string; lngLat: LngLat };
const STOPS = (ltc as unknown as { stops: Stop[] }).stops;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const cache = new Map<string, SideQuest[]>();

export function regionSideQuests(region: string): SideQuest[] {
  const hit = cache.get(region);
  if (hit) return hit;
  const di = DISTRICTS.findIndex((d) => d.name === region);
  const d = DISTRICTS[di];
  if (!d) return [];
  const here = PLACES.filter((p) => p.d === di);
  const pick = (cats: Place["c"][], salt: number) => {
    const list = here.filter((p) => cats.includes(p.c));
    return list.length ? list[(hash(region) + salt) % list.length] : null;
  };
  const stop = STOPS.filter((s) => districtAt(s.lngLat) === region)[0] ?? null;

  const make: Record<SideKind, () => SideQuest | null> = {
    photo: () => {
      const p = pick(["culture", "park"], 1);
      return { id: `${region}:side:photo`, region, kind: "photo", title: "Photo op", detail: p ? `Get the shot at ${p.n}.` : `Find the best view in ${region}.`, at: p?.p ?? d.label, radius: p?.c === "park" ? 160 : 90, place: p?.n };
    },
    bus: () =>
      stop && { id: `${region}:side:bus`, region, kind: "bus", title: "Ride in on the bus", detail: `Hop off at ${stop.name}.`, at: stop.lngLat, radius: 70, place: stop.name },
    night: () => {
      const p = pick(["food", "cafe"], 2);
      return p && { id: `${region}:side:night`, region, kind: "night", title: "Night shift", detail: `Show up at ${p.n} after 8 pm.`, at: p.p, radius: 60, place: p.n };
    },
    trivia: () => ({ id: `${region}:side:trivia`, region, kind: "trivia", title: "Local trivia", detail: "Answer once you've set foot here.", at: d.label, radius: 0, trivia: TRIVIA[hash(region) % TRIVIA.length] }),
    crawl: () => {
      const p = pick(["food"], 3);
      return p && { id: `${region}:side:crawl`, region, kind: "crawl", title: "Food crawl", detail: `Start the crawl at ${p.n}.`, at: p.p, radius: 60, place: p.n };
    },
    crew: () => {
      const p = pick(["park"], 4);
      return p && { id: `${region}:side:crew`, region, kind: "crew", title: "Crew meet-up", detail: `Bring a friend to ${p.n}.`, at: p.p, radius: 160, place: p.n };
    },
    tag: () => {
      const p = pick(["shop", "food", "cafe"], 5);
      return { id: `${region}:side:tag`, region, kind: "tag", title: "Leave your mark", detail: p ? `Drop a tag near ${p.n}.` : `Drop a tag anywhere in ${region}.`, at: p?.p ?? d.label, radius: 90, place: p?.n };
    },
  };

  // Rotate the order per region so neighbouring boards don't look the same.
  const order: SideKind[] = ["photo", "bus", "night", "trivia", "crawl", "crew", "tag"];
  const start = hash(region + "side") % order.length;
  const out: SideQuest[] = [];
  for (let i = 0; i < order.length && out.length < 3; i++) {
    const q = make[order[(start + i) % order.length]]();
    if (q) out.push(q);
  }
  cache.set(region, out);
  return out;
}

export const allSideQuests = () => DISTRICTS.flatMap((d) => regionSideQuests(d.name));

export type SideCheck = { ok: true } | { ok: false; reason: string };

/** Can this side quest be completed right now? (GPS-verified; demo mode waives the clock for night shifts.) */
export function sideQuestCheck(q: SideQuest, at: LngLat | null, visited: boolean, demo = false, answer?: number): SideCheck {
  if (q.kind === "trivia") {
    if (!visited) return { ok: false, reason: `Set foot in ${q.region} first.` };
    return answer === q.trivia?.answer ? { ok: true } : { ok: false, reason: "Not quite. Try again." };
  }
  if (!at) return { ok: false, reason: "Turn on location first." };
  if (distanceM(at, q.at) > q.radius) return { ok: false, reason: `Get closer to ${q.place ?? "the spot"}.` };
  const h = new Date().getHours();
  if (q.kind === "night" && !demo && h < 20 && h >= 5) return { ok: false, reason: "Come back after 8 pm." };
  return { ok: true };
}
