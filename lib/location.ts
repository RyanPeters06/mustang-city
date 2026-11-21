/**
 * Live location → fog reveal. Fixes stay out of React state (Constitution V).
 * Drops fixes with accuracy worse than 50 m or implying impossible speed.
 */
import { bearing, distanceM, type LngLat } from "./geo";
import { revealAt } from "./fog";

const MAX_ACCURACY_M = 50;
const MAX_SPEED_MS = 45;

export type LocationStatus = "idle" | "watching" | "denied" | "unavailable";
type Fix = { lngLat: LngLat; heading: number | null; ts: number };

let watchId: number | null = null;
let last: Fix | null = null;
let status: LocationStatus = "idle";
const fixListeners = new Set<(fix: Fix) => void>();
const statusListeners = new Set<() => void>();

function setStatus(s: LocationStatus) {
  status = s;
  statusListeners.forEach((l) => l());
}

export const getLocationStatus = () => status;
export const getServerLocationStatus = (): LocationStatus => "idle";
export function subscribeLocationStatus(l: () => void) {
  statusListeners.add(l);
  return () => statusListeners.delete(l);
}

/** Subscribe to accepted fixes (map uses this for the player dot). */
export function onFix(l: (fix: Fix) => void) {
  fixListeners.add(l);
  return () => fixListeners.delete(l);
}

export const getLastFix = () => last;

/** Push a fix through the same pipeline as GPS (used by live GPS and the demo walk). */
export function acceptFix(lngLat: LngLat, heading: number | null = null, ts = Date.now()) {
  // No compass heading (laptops, standing still)? Use direction of travel, else keep the last one.
  if (heading === null || Number.isNaN(heading)) {
    heading = last && distanceM(last.lngLat, lngLat) > 3 ? bearing(last.lngLat, lngLat) : (last?.heading ?? 0);
  }
  const fix = { lngLat, heading, ts };
  last = fix;
  revealAt(lngLat[1], lngLat[0]);
  fixListeners.forEach((l) => l(fix));
}

export function startWatching() {
  if (watchId !== null) return;
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return setStatus("unavailable");
  setStatus("watching");
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude, accuracy, heading } = pos.coords;
      if (accuracy > MAX_ACCURACY_M) return;
      const lngLat: LngLat = [longitude, latitude];
      if (last) {
        const dt = (pos.timestamp - last.ts) / 1000;
        if (dt > 0 && distanceM(last.lngLat, lngLat) / dt > MAX_SPEED_MS) return;
      }
      acceptFix(lngLat, heading, pos.timestamp);
    },
    (err) => {
      stopWatching();
      setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
    },
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
  );
}

export function stopWatching() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}
