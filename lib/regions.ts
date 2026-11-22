/**
 * Region quests: how a neighbourhood gets claimed. Walking every street is unrealistic, so each of the 42
 * neighbourhoods has four quests built from real local places (OpenStreetMap, lib/data/places.json) and the
 * game's own missions/collectibles. Finish CLAIM_NEEDED of them and the whole region is claimed: its fog lifts.
 *
 *   1. Set foot      — any GPS fix inside the region
 *   2. Explore       — clear N blocks of its fog (a short walk, not 30% of the area)
 *   3. Local stop    — check in at a real local café / restaurant / shop
 *   4. Signature     — the region's Goose job or hidden collectible if it has one, else a named park or museum
 *
 * Pure functions over the player's stored progress; lib/progress.ts records visits/check-ins and claims.
 */
import placesRaw from "./data/places.json";
import { DISTRICTS, districtAt, getDistrictStats, type DistrictStat } from "./districts";
import { MISSIONS } from "./missions";
import { COLLECTIBLES } from "./collectibles";
import { distanceM, type LngLat } from "./geo";

export const CLAIM_NEEDED = 3;
export const REGION_REP = 150;

export type PlaceCat = "cafe" | "food" | "shop" | "park" | "culture";
export type Place = { n: string; c: PlaceCat; p: LngLat; d: number };
export const PLACES = placesRaw as Place[];

/** How close a check-in has to be. Parks are big, so their (centroid) radius is generous. */
export const checkInRadius = (c: PlaceCat) => (c === "park" ? 160 : c === "culture" ? 80 : 45);

export type Quest =
  | { id: string; kind: "visit"; title: string; detail: string }
  | { id: string; kind: "explore"; title: string; detail: string; cells: number }
  | { id: string; kind: "checkin"; title: string; detail: string; cats: PlaceCat[]; place?: string }
  | { id: string; kind: "mission"; title: string; detail: string; slug: string }
  | { id: string; kind: "collectible"; title: string; detail: string; collectible: string };

export type RegionInput = {
  visits: Record<string, number>;
  checkins: Record<string, { place: string; at: number }>;
  completions: Record<string, unknown>;
  finds: Record<string, number>;
};

const LOCAL: { cat: PlaceCat; title: string; detail: string }[] = [
  { cat: "cafe", title: "Grab a coffee somewhere local", detail: "Check in at any café in the area." },
  { cat: "food", title: "Eat somewhere local", detail: "Check in at a restaurant, pub or takeout spot here." },
  { cat: "shop", title: "Browse a local shop", detail: "Check in at a bookshop, bakery, thrift store or similar." },
];

const cache = new Map<string, Quest[]>();

/** The four quests for a region (deterministic, so friends get the same board). */
export function regionQuests(name: string): Quest[] {
  const hit = cache.get(name);
  if (hit) return hit;
  const di = DISTRICTS.findIndex((d) => d.name === name);
  const here = PLACES.filter((p) => p.d === di);
  const has = (c: PlaceCat) => here.some((p) => p.c === c);
  const stat = getDistrictStats().find((s) => s.name === name);
  const total = stat?.total ?? 4000;
  // ~7 res-11 cells ≈ one city block; a 15–25 minute wander clears this much.
  const cells = Math.max(56, Math.min(210, Math.round(total * 0.05)));

  const quests: Quest[] = [
    { id: `${name}:visit`, kind: "visit", title: `Set foot in ${name}`, detail: "Get there any way you like: walk, bike or bus." },
    { id: `${name}:explore`, kind: "explore", title: `Explore ${Math.round(cells / 7)} blocks`, detail: "Wander its streets to clear the fog.", cells },
  ];

  const local = LOCAL.find((l) => has(l.cat));
  if (local) quests.push({ id: `${name}:local`, kind: "checkin", title: local.title, detail: local.detail, cats: [local.cat] });

  const mission = MISSIONS.find((m) => m.type !== "heist" && districtAt(m.lngLat) === name);
  const collectible = COLLECTIBLES.find((c) => districtAt(c.lngLat) === name);
  const culture = here.find((p) => p.c === "culture");
  const park = here.find((p) => p.c === "park");
  if (mission) quests.push({ id: `${name}:mission`, kind: "mission", title: `Goose job: ${mission.title}`, detail: "The Goose has work for you here.", slug: mission.slug });
  else if (collectible) quests.push({ id: `${name}:collectible`, kind: "collectible", title: `Find the ${collectible.name}`, detail: "A hidden collectible is somewhere in this area. It shows up within 50 m.", collectible: collectible.id });
  else if (culture) quests.push({ id: `${name}:sig`, kind: "checkin", title: `Visit ${culture.n}`, detail: "A local landmark worth the trip.", cats: ["culture"], place: culture.n });
  else if (park) quests.push({ id: `${name}:sig`, kind: "checkin", title: `Hang out at ${park.n}`, detail: "Find a bench, take in the view, check in.", cats: ["park"], place: park.n });

  // Every board has four quests: top up with whatever the area has.
  if (quests.length < 4 && park && !quests.some((q) => q.kind === "checkin" && q.place === park.n))
    quests.push({ id: `${name}:park`, kind: "checkin", title: `Hang out at ${park.n}`, detail: "Find a bench, take in the view, check in.", cats: ["park"], place: park.n });
  if (quests.length < 4) {
    const other = LOCAL.find((l) => has(l.cat) && l !== local);
    if (other) quests.push({ id: `${name}:local2`, kind: "checkin", title: other.title, detail: other.detail, cats: [other.cat] });
  }
  if (quests.length < 4)
    quests.push({ id: `${name}:explore2`, kind: "explore", title: `Go deeper: ${Math.round((cells * 2) / 7)} blocks`, detail: "Cover more of the area on foot.", cells: cells * 2 });

  const out = quests.slice(0, 4);
  cache.set(name, out);
  return out;
}

export function questDone(q: Quest, input: RegionInput, stat: DistrictStat | undefined, region: string): boolean {
  switch (q.kind) {
    case "visit":
      return !!input.visits[region];
    case "explore":
      return (stat?.have ?? 0) >= q.cells;
    case "checkin":
      return !!input.checkins[q.id];
    case "mission":
      return !!input.completions[q.slug];
    case "collectible":
      return !!input.finds[q.collectible];
  }
}

export type RegionProgress = { name: string; quests: Quest[]; done: boolean[]; count: number; claimable: boolean };

export function regionProgress(name: string, input: RegionInput, stats = getDistrictStats()): RegionProgress {
  const quests = regionQuests(name);
  const stat = stats.find((s) => s.name === name);
  const done = quests.map((q) => questDone(q, input, stat, name));
  const count = done.filter(Boolean).length;
  return { name, quests, done, count, claimable: count >= CLAIM_NEEDED };
}

/** Places a check-in quest accepts, nearest first (to the given point, or unsorted). */
export function questPlaces(q: Extract<Quest, { kind: "checkin" }>, region: string, from?: LngLat | null): (Place & { m?: number })[] {
  const di = DISTRICTS.findIndex((d) => d.name === region);
  const list = PLACES.filter((p) => p.d === di && q.cats.includes(p.c) && (!q.place || p.n === q.place));
  if (!from) return list;
  return list.map((p) => ({ ...p, m: distanceM(from, p.p) })).sort((a, b) => a.m - b.m);
}

/** The accepted place the player is standing at, if any. */
export function checkInTarget(q: Extract<Quest, { kind: "checkin" }>, region: string, at: LngLat) {
  const near = questPlaces(q, region, at)[0];
  return near && (near.m ?? Infinity) <= checkInRadius(near.c) ? near : null;
}

/** Centre-ish point of a region (its label point), for "nearest region" lists. */
export const regionCenter = (name: string) => DISTRICTS.find((d) => d.name === name)?.label ?? null;
