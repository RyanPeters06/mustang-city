"use client";
/** Demo panel switch: simulate a heist crew locally when accounts aren't available (always labelled "demo"). */
let on = false;
const listeners = new Set<() => void>();
export const getHeistSim = () => on;
export const getServerHeistSim = () => false;
export function subscribeHeistSim(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function setHeistSim(v: boolean) {
  on = v;
  listeners.forEach((l) => l());
}
