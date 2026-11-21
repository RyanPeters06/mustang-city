/**
 * Live location. Fixes stay out of React state (Constitution V).
 *
 * - Every fix moves the player marker (with an accuracy circle), however rough.
 * - Only fixes accurate to REVEAL_ACCURACY_M clear fog, and never ones implying impossible speed.
 * - Heading comes from the compass when available (iOS asks permission on the same tap),
 *   else GPS course, else direction of travel; null means "unknown" (marker shows a dot).
 */
import { bearing, distanceM, type LngLat } from "./geo";
import { revealAround } from "./fog";

export const REVEAL_ACCURACY_M = 50;
const MAX_SPEED_MS = 45;

export type LocationStatus = "idle" | "locating" | "watching" | "denied" | "unavailable";
export type FixSource = "gps" | "demo" | "replay";
export type Fix = { lngLat: LngLat; heading: number | null; accuracy: number; ts: number; source: FixSource };
export type LocationState = { status: LocationStatus; accuracy: number | null };

let watchId: number | null = null;
let current: Fix | null = null; // latest position shown on the map
let lastGood: Fix | null = null; // latest fix accurate enough to clear fog (speed check)
let compassHeading: number | null = null;
let replaying = false;
/** While true, live GPS fixes are ignored so a replay can drive the marker. */
export const setReplaying = (on: boolean) => {
  replaying = on;
};
let state: LocationState = { status: "idle", accuracy: null };
const fixListeners = new Set<(fix: Fix, first: boolean) => void>();
const stateListeners = new Set<() => void>();

function setState(next: Partial<LocationState>) {
  const merged = { ...state, ...next };
  if (merged.status === state.status && merged.accuracy === state.accuracy) return;
  state = merged;
  stateListeners.forEach((l) => l());
}

export const getLocationState = () => state;
const SERVER_STATE: LocationState = { status: "idle", accuracy: null };
export const getServerLocationState = () => SERVER_STATE;
export function subscribeLocationState(l: () => void) {
  stateListeners.add(l);
  return () => stateListeners.delete(l);
}

/** Subscribe to position/heading updates. `first` is true for the first fix of a session. */
export function onFix(l: (fix: Fix, first: boolean) => void) {
  fixListeners.add(l);
  return () => fixListeners.delete(l);
}

export const getLastFix = () => current;

function emit(fix: Fix, first: boolean) {
  fixListeners.forEach((l) => l(fix, first));
}

/**
 * Push a position through the same pipeline as GPS (live GPS and the demo walk both use this).
 * Returns true if it cleared fog.
 */
export function acceptFix(
  lngLat: LngLat,
  opts: { accuracy?: number; course?: number | null; ts?: number; source?: FixSource } = {},
) {
  const { accuracy = 5, course = null, ts = Date.now(), source = "demo" } = opts;
  const prev = current;

  let heading: number | null = compassHeading;
  if (heading === null && course !== null && !Number.isNaN(course)) heading = course;
  if (heading === null && prev) {
    heading = distanceM(prev.lngLat, lngLat) > 4 ? bearing(prev.lngLat, lngLat) : prev.heading;
  }

  const fix: Fix = { lngLat, heading, accuracy, ts, source };
  current = fix;
  setState({ status: "watching", accuracy: Math.round(accuracy) });

  let revealed = false;
  if (accuracy <= REVEAL_ACCURACY_M) {
    // Compare with the previous *accurate* fix: a single GPS spike is skipped, but if the next
    // fix agrees with it (a real relocation, e.g. app reopened elsewhere) fog clears from there.
    const dt = lastGood ? (ts - lastGood.ts) / 1000 : Infinity;
    const tooFast = lastGood && dt > 0 && dt < 120 && distanceM(lastGood.lngLat, lngLat) / dt > MAX_SPEED_MS;
    lastGood = fix;
    if (!tooFast) {
      revealAround(lngLat[1], lngLat[0]);
      revealed = true;
    }
  }
  emit(fix, !prev);
  return revealed;
}

// ---- Compass ---------------------------------------------------------------------
let lastCompassEmit = 0;
function onOrientation(e: DeviceOrientationEvent) {
  const webkit = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
  const h = typeof webkit === "number" ? webkit : e.absolute && e.alpha !== null ? (360 - e.alpha) % 360 : null;
  if (h === null) return;
  compassHeading = h;
  const now = performance.now();
  if (current && now - lastCompassEmit > 100) {
    lastCompassEmit = now;
    current = { ...current, heading: h };
    emit(current, false);
  }
}

async function startCompass() {
  if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;
  const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
  try {
    // iOS 13+: must be requested from a user gesture (the Enable / locate tap).
    if (typeof DOE.requestPermission === "function" && (await DOE.requestPermission()) !== "granted") return;
  } catch {
    return;
  }
  window.addEventListener("deviceorientationabsolute" as "deviceorientation", onOrientation);
  window.addEventListener("deviceorientation", onOrientation);
}

// ---- GPS -------------------------------------------------------------------------
export function startWatching() {
  if (watchId !== null) return;
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return setState({ status: "unavailable" });
  void startCompass();
  setState({ status: current ? "watching" : "locating" });
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude, accuracy, heading, speed } = pos.coords;
      const course = heading !== null && (speed ?? 0) > 0.5 ? heading : null;
      if (replaying) return; // a replay owns the marker until it stops
      acceptFix([longitude, latitude], { accuracy, course, ts: pos.timestamp, source: "gps" });
    },
    (err) => {
      // Timeouts / temporary signal loss: keep watching, the next fix will come.
      if (err.code === err.PERMISSION_DENIED) {
        stopWatching();
        setState({ status: "denied" });
      } else if (!current) {
        setState({ status: "locating" });
      }
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 },
  );
}

export function stopWatching() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}
