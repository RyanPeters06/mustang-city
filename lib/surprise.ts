/**
 * Surprise blips (IDEAS §2): three gold blips a day at real spots across Forest State, the same for everyone
 * (seeded by the date). Reach one before midnight for bonus Rep and loot. A reason to go somewhere new today.
 */
import { PLACES } from "./regions";
import { DISTRICTS } from "./districts";
import { dayKey } from "./daily";
import { distanceM, type LngLat } from "./geo";

export const SURPRISE_REP = 75;
export const SURPRISE_RADIUS_M = 60;

export type Surprise = { id: string; name: string; region: string; at: LngLat };

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const cache = new Map<string, Surprise[]>();

/** Today's three surprises, each in a different region. */
export function todaysSurprises(day = dayKey()): Surprise[] {
  const hit = cache.get(day);
  if (hit) return hit;
  const out: Surprise[] = [];
  const used = new Set<number>();
  let h = hash(day + "surprise");
  for (let tries = 0; out.length < 3 && tries < 50; tries++) {
    h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0;
    const p = PLACES[h % PLACES.length];
    if (used.has(p.d)) continue;
    used.add(p.d);
    out.push({ id: `${day}:${out.length}`, name: p.n, region: DISTRICTS[p.d]?.name ?? "Forest State", at: p.p });
  }
  cache.set(day, out);
  return out;
}

export const surpriseAt = (at: LngLat, day = dayKey()) => todaysSurprises(day).find((s) => distanceM(at, s.at) <= SURPRISE_RADIUS_M) ?? null;
