/** Mapbox Standard configuration for the Forest State sunset look. */

import * as SunCalc from "suncalc";

export type LightPreset = "dawn" | "day" | "dusk" | "night";

const LONDON_LAT = 42.9849;
const LONDON_LNG = -81.2453;
const MIN = 60_000;

/**
 * Light preset from the real sun over London, ON (brief → Time-of-day palette):
 * dawn from 30 min before sunrise to 45 min after, golden "dusk" from 60 min before sunset to
 * 30 min after, night outside that, day in between.
 */
export function londonLightPreset(now = new Date()): LightPreset {
  const t = SunCalc.getTimes(now, LONDON_LAT, LONDON_LNG);
  const ms = now.getTime();
  const sunrise = t.sunrise?.getTime() ?? NaN;
  const sunset = t.sunset?.getTime() ?? NaN;
  if (Number.isNaN(sunrise) || Number.isNaN(sunset)) return "day";
  if (ms >= sunrise - 30 * MIN && ms < sunrise + 45 * MIN) return "dawn";
  if (ms >= sunset - 60 * MIN && ms < sunset + 30 * MIN) return "dusk";
  if (ms >= sunrise + 45 * MIN && ms < sunset - 60 * MIN) return "day";
  return "night";
}

/** Today's sunrise/sunset in London (for UI copy). */
export const londonSunTimes = (now = new Date()) => SunCalc.getTimes(now, LONDON_LAT, LONDON_LNG);

// ---- Demo override (demo panel) ----------------------------------------------------
let override: LightPreset | null = null;
const listeners = new Set<() => void>();
export const getLightOverride = () => override;
export function setLightOverride(p: LightPreset | null) {
  override = p;
  listeners.forEach((l) => l());
}
export function subscribeLight(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
/** The preset the map should show right now (override wins). */
export const currentLightPreset = () => override ?? londonLightPreset();

export function basemapConfig(lightPreset: LightPreset) {
  return {
    lightPreset,
    showPointOfInterestLabels: false,
    showTransitLabels: false,
    showPedestrianRoads: false,
    // Off: towns outside London would float on the sea. Our own island/district names replace them.
    showPlaceLabels: false,
    showRoadLabels: false,
    showAdminBoundaries: false,
    show3dObjects: true,
    colorLand: "#20143a",
    colorWater: "#3a2b8a",
    colorGreenspace: "#24344d",
    colorEducation: "#30214f",
    colorBuildings: "#54457f",
    colorMotorways: "#ff6f91",
    colorTrunks: "#ff9a6a",
    colorRoads: "#a06f9f",
    roadsBrightness: 0.85,
    colorPlaceLabels: "#ffd9ec",
  } as const;
}

/** Sunset horizon glow so tilted views fade into a pink-orange sky. */
export const ATMOSPHERE = {
  range: [0.8, 9] as [number, number],
  color: "#ff8a6a",
  "high-color": "#7b2ff7",
  "horizon-blend": 0.12,
  "space-color": "#140a2e",
  "star-intensity": 0.25,
};

export const CITY_PITCH = 45;
export const CAMPUS_PITCH = 60;
export const CAMPUS_ZOOM = 15;
