"use client";
/** Live buses: polls /api/buses every 15 s while the app is visible; positions glide between updates. */
import type { Vehicle } from "./ltc";

export type BusStatus = "loading" | "live" | "delayed" | "simulated" | "unavailable";
export type BusState = { status: BusStatus; ageSec: number | null; count: number };

let state: BusState = { status: "loading", ageSec: null, count: 0 };
const SERVER: BusState = state;
const listeners = new Set<() => void>();
const frameListeners = new Set<(v: Vehicle[]) => void>();
let prev = new Map<string, Vehicle>();
let next: Vehicle[] = [];
let tStart = 0;
let started = false;
const GLIDE_MS = 2500;

export const getBuses = () => state;
export const getServerBuses = () => SERVER;
export function subscribeBuses(l: () => void) {
  start();
  listeners.add(l);
  return () => listeners.delete(l);
}
/** Called every animation frame while buses are gliding, with interpolated positions. */
export function onBusFrame(l: (v: Vehicle[]) => void) {
  start();
  frameListeners.add(l);
  return () => frameListeners.delete(l);
}

async function poll() {
  if (document.visibilityState !== "visible") return;
  try {
    const res = await fetch("/api/buses", { cache: "no-store" });
    const j = (await res.json()) as { vehicles: Vehicle[]; status: BusStatus; ageSec: number | null };
    prev = new Map(current().map((v) => [v.id, v]));
    next = j.vehicles;
    tStart = performance.now();
    state = { status: j.status, ageSec: j.ageSec, count: j.vehicles.length };
    listeners.forEach((l) => l());
    requestAnimationFrame(tick);
  } catch {
    state = { ...state, status: state.count ? "delayed" : "unavailable" };
    listeners.forEach((l) => l());
  }
}

function current(): Vehicle[] {
  const k = Math.min(1, (performance.now() - tStart) / GLIDE_MS);
  return next.map((v) => {
    const p = prev.get(v.id);
    if (!p || k >= 1) return v;
    return { ...v, lngLat: [p.lngLat[0] + (v.lngLat[0] - p.lngLat[0]) * k, p.lngLat[1] + (v.lngLat[1] - p.lngLat[1]) * k] };
  });
}

function tick() {
  const vs = current();
  frameListeners.forEach((l) => l(vs));
  if (performance.now() - tStart < GLIDE_MS) requestAnimationFrame(tick);
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  void poll();
  setInterval(() => void poll(), 15_000);
  document.addEventListener("visibilitychange", () => void poll());
}
