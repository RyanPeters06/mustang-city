/**
 * Geography constants for Forest State (London, ON) and Mustang City (Western campus).
 * Coordinates are [lng, lat]. The London boundary is the City of London's municipal outline
 * from OpenStreetMap (© OpenStreetMap contributors, ODbL), simplified to 91 points.
 */
import londonBoundary from "./data/londonBoundary.json";
import campusBoundary from "./data/campusBoundary.json";
import campusBuildings from "./data/campusBuildings.json";

export type LngLat = [number, number];

export const LONDON_BOUNDARY = londonBoundary as LngLat[];

/** Named Western buildings (OpenStreetMap), used for campus labels. */
export const CAMPUS_BUILDINGS = campusBuildings as { name: string; lng: number; lat: number; residence: boolean }[];

/**
 * Camera can't leave Forest State, like a game's pause-menu map. Mapbox clamps the camera *centre* to these bounds,
 * so they're London's own extent (lon -81.391..-81.107, lat 42.825..43.073) pulled in slightly: at the furthest
 * you can push, the island's edge sits just past the middle of the screen with sea beyond, and no further.
 */
export const MAX_BOUNDS: [LngLat, LngLat] = [
  [-81.37, 42.845],
  [-81.13, 43.055],
];

/**
 * A box of open sea around the island; London is cut out of it. Deliberately huge (~8° each way) so that even
 * fully tilted at minimum zoom the horizon is all sea and no plain basemap shows through in the distance.
 */
export const SEA_RING: LngLat[] = [
  [-89, 35],
  [-73, 35],
  [-73, 51],
  [-89, 51],
  [-89, 35],
];

/** Signed area > 0 means counter-clockwise (used to push surf rings outward). */
export function ringIsCounterClockwise(ring: LngLat[]) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return sum > 0;
}

/** Compass bearing in degrees from a to b. */
export function bearing([lng1, lat1]: LngLat, [lng2, lat2]: LngLat) {
  const toRad = Math.PI / 180;
  const y = Math.sin((lng2 - lng1) * toRad) * Math.cos(lat2 * toRad);
  const x =
    Math.cos(lat1 * toRad) * Math.sin(lat2 * toRad) -
    Math.sin(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.cos((lng2 - lng1) * toRad);
  return (Math.atan2(y, x) / toRad + 360) % 360;
}

/** Middle of the island (boundary bbox centre) — the "Fly to Forest State" overview target. */
export const LONDON_CENTER: LngLat = [-81.2489, 42.9488];

/** Western University main campus. */
export const CAMPUS_CENTER: LngLat = [-81.2737, 43.0096];

export const CAMPUS_BBOX = {
  west: -81.2875,
  south: 43.0015,
  east: -81.2625,
  north: 43.0175,
};

/** Mission buildings that glow: any building footprint containing this point (Mapbox Search positions). */
export const MISSION_BUILDINGS: { name: string; point: LngLat }[] = [
  { name: "Middlesex College", point: [-81.27025, 43.00936] },
  { name: "University Community Centre", point: [-81.27621, 43.00865] },
  { name: "D.B. Weldon Library", point: [-81.27565, 43.00789] },
];

/** Western's real campus boundary (OSM landuse=university), the edge of Mustang City. */
export const CAMPUS_RING = campusBoundary.ring as LngLat[];

export function inCampus([lng, lat]: LngLat) {
  if (lng < CAMPUS_BBOX.west - 0.01 || lng > CAMPUS_BBOX.east + 0.01 || lat < CAMPUS_BBOX.south - 0.01 || lat > CAMPUS_BBOX.north + 0.01) return false;
  let inside = false;
  for (let i = 0, j = CAMPUS_RING.length - 1; i < CAMPUS_RING.length; j = i++) {
    const [xi, yi] = CAMPUS_RING[i];
    const [xj, yj] = CAMPUS_RING[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Scripted demo walk: UCC → UC Hill → Middlesex → Natural Science → Weldon → Thames bank. */
export const DEMO_WALK: LngLat[] = [
  [-81.2752, 43.0081],
  [-81.2744, 43.0086],
  [-81.2737, 43.0090],
  [-81.2726, 43.0092],
  [-81.2712, 43.0093],
  [-81.2703, 43.0100],
  [-81.2709, 43.0110],
  [-81.2722, 43.0118],
  [-81.2738, 43.0122],
  [-81.2755, 43.0116],
  [-81.2768, 43.0105],
  [-81.2781, 43.0094],
  [-81.2790, 43.0080],
  [-81.2786, 43.0064],
  [-81.2770, 43.0055],
];

/** Densify a path so consecutive points are at most `stepM` metres apart. */
export function densify(path: LngLat[], stepM = 20): LngLat[] {
  const out: LngLat[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const [a, b] = [path[i], path[i + 1]];
    const d = distanceM(a, b);
    const n = Math.max(1, Math.ceil(d / stepM));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  out.push(path[path.length - 1]);
  return out;
}

export function distanceM([lng1, lat1]: LngLat, [lng2, lat2]: LngLat) {
  const R = 6371000;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
