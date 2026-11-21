"use client";
/** Live weather (polls /api/weather every 10 min). Demo panel can force rain/snow. */
import type { Weather } from "@/app/api/weather/route";

const NONE: Weather = { kind: "clear", label: "", intensity: 0, tempC: null, status: "unavailable" };
let live: Weather = NONE;
let forced: Weather["kind"] | null = null;
let state: Weather = NONE;
let started = false;
const listeners = new Set<() => void>();

function compute() {
  state = forced ? { ...live, kind: forced, label: `${forced[0].toUpperCase()}${forced.slice(1)} (demo)`, intensity: 0.8, status: "live" } : live;
  listeners.forEach((l) => l());
}
export const getWeather = () => state;
export const getServerWeather = () => NONE;
export function subscribeWeather(l: () => void) {
  if (!started && typeof window !== "undefined") {
    started = true;
    const load = () =>
      fetch("/api/weather")
        .then((r) => r.json())
        .then((w: Weather) => {
          live = w;
          compute();
        })
        .catch(() => {});
    void load();
    setInterval(load, 10 * 60_000);
  }
  listeners.add(l);
  return () => listeners.delete(l);
}
export function forceWeather(kind: Weather["kind"] | null) {
  forced = kind;
  compute();
}
