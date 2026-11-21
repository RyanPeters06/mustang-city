"use client";
/**
 * Ride detection (no account needed): you're on a bus when you've moved faster than walking pace
 * (> 14 km/h) for 90 s while staying within 40 m of one LTC route's shape. One ride per route per 30 min.
 */
import { onFix } from "./location";
import { LTC, distToLine } from "./ltcData";
import { celebrate } from "./celebrate";

const KEY = "mc.rides.v1";
type Rides = Record<string, number[]>; // route id -> ride timestamps

let rides: Rides = {};
let loaded = false;
let started = false;
const listeners = new Set<() => void>();
let snap: { rides: Rides; routes: number; total: number } = { rides: {}, routes: 0, total: LTC.routes.length };
const SERVER = snap;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    rides = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Rides;
  } catch {
    rides = {};
  }
  snap = { rides, routes: Object.keys(rides).length, total: LTC.routes.length };
}
export const getRides = () => (load(), snap);
export const getServerRides = () => SERVER;
export function subscribeRides(l: () => void) {
  load();
  startRideDetection();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function recordRide(route: string) {
  load();
  const list = rides[route] ?? [];
  if (list.length && Date.now() - list[list.length - 1] < 30 * 60_000) return false;
  rides = { ...rides, [route]: [...list, Date.now()] };
  try {
    localStorage.setItem(KEY, JSON.stringify(rides));
  } catch {
    /* ignore */
  }
  snap = { rides, routes: Object.keys(rides).length, total: LTC.routes.length };
  listeners.forEach((l) => l());
  return true;
}

/** Distinct days a route was ridden (for Route 6 Regular). */
export const rideDays = (route: string) => new Set((getRides().rides[route] ?? []).map((t) => new Date(t).toDateString())).size;

export function startRideDetection() {
  if (started || typeof window === "undefined") return;
  started = true;
  const window90: { t: number; p: [number, number] }[] = [];
  let candidate: string | null = null;
  let since = 0;
  onFix((fix) => {
    if (fix.source === "replay") return;
    const now = fix.ts;
    window90.push({ t: now, p: fix.lngLat });
    while (window90.length && now - window90[0].t > 90_000) window90.shift();
    if (window90.length < 3) return;
    const first = window90[0];
    const dt = (now - first.t) / 3600_000;
    const dx = Math.hypot((fix.lngLat[0] - first.p[0]) * 111320 * Math.cos((fix.lngLat[1] * Math.PI) / 180), (fix.lngLat[1] - first.p[1]) * 111320) / 1000;
    const fast = dt > 0 && dx / dt > 14;
    let route: string | null = null;
    if (fast) {
      let best = 40;
      for (const s of LTC.shapes) {
        const d = distToLine(fix.lngLat, s.line);
        if (d < best) {
          best = d;
          route = s.route;
        }
      }
    }
    if (!route) {
      candidate = null;
      since = 0;
      return;
    }
    if (route !== candidate) {
      candidate = route;
      since = now;
      return;
    }
    if (now - since >= 90_000 && recordRide(route)) {
      const r = LTC.routes.find((x) => x.id === route);
      celebrate({
        id: `ride-${route}-${now}`,
        kind: "ride",
        title: r?.long && r.long !== `Route ${r.name}` ? `Route ${r.name} · ${r.long}` : `Route ${r?.name ?? route}`,
        subtitle: `Every Route: ${getRides().routes}/${LTC.routes.length}`,
        color: r?.color ?? "#2ee6d6",
        glyph: "M6 4h12a2 2 0 0 1 2 2v10H4V6a2 2 0 0 1 2-2z M4 11h16 M7 19v-3 M17 19v-3",
      });
      candidate = null;
    }
  });
}
