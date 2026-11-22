/**
 * Accessibility mode (IDEAS §1): exploring shouldn't require squeezing through a café door to count.
 *   wideCheckins: doubles every check-in radius (region quests, side quests)
 *   largeText:    scales the whole app up ~12% (html[data-large] in globals.css)
 * Stored per device.
 */
export type A11y = { wideCheckins: boolean; largeText: boolean };
const KEY = "mc.a11y.v1";
const DEFAULT: A11y = { wideCheckins: false, largeText: false };

let state: A11y = DEFAULT;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    state = { ...DEFAULT, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<A11y>) };
  } catch {
    /* defaults */
  }
  apply();
}

function apply() {
  if (typeof document === "undefined") return;
  if (state.largeText) document.documentElement.setAttribute("data-large", "1");
  else document.documentElement.removeAttribute("data-large");
}

export function getA11y() {
  load();
  return state;
}
export const getServerA11y = () => DEFAULT;
export function subscribeA11y(l: () => void) {
  load();
  listeners.add(l);
  return () => listeners.delete(l);
}
export function setA11y(patch: Partial<A11y>) {
  load();
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  apply();
  listeners.forEach((l) => l());
}

/** Multiplier for check-in radii. */
export const radiusScale = () => (getA11y().wideCheckins ? 2 : 1);
