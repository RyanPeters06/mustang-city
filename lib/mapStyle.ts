/** Mapbox Standard configuration for the Forest State sunset look. */

export type LightPreset = "dawn" | "day" | "dusk" | "night";

/** Light preset from London, ON local time (fixed windows; suncalc-accurate timing is a later feature). */
export function londonLightPreset(now = new Date()): LightPreset {
  const hour = Number(
    new Intl.DateTimeFormat("en-CA", { hour: "numeric", hour12: false, timeZone: "America/Toronto" }).format(now),
  );
  if (hour >= 6 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 16) return "day";
  if (hour >= 16 && hour < 19) return "dusk";
  return "night";
}

export function basemapConfig(lightPreset: LightPreset) {
  return {
    lightPreset,
    showPointOfInterestLabels: false,
    showTransitLabels: false,
    showPedestrianRoads: false,
    showPlaceLabels: true,
    showRoadLabels: false,
    show3dObjects: true,
    colorWater: "#3b1a8a",
    colorMotorways: "#ff4f8b",
    colorTrunks: "#ff8a3d",
    colorGreenspace: "#2a4a3f",
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
