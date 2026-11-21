/**
 * Geography constants for Forest State (London, ON) and Mustang City (Western campus).
 * Coordinates are [lng, lat]. The London boundary is a hand-simplified outline of the
 * city's municipal extent — good enough for fog + % explored; swap for open data later.
 */

export type LngLat = [number, number];

export const LONDON_BOUNDARY: LngLat[] = [
  [-81.395, 43.012],
  [-81.37, 43.055],
  [-81.31, 43.078],
  [-81.235, 43.083],
  [-81.17, 43.068],
  [-81.12, 43.04],
  [-81.105, 42.99],
  [-81.13, 42.935],
  [-81.2, 42.905],
  [-81.29, 42.9],
  [-81.355, 42.925],
  [-81.39, 42.965],
  [-81.395, 43.012],
];

export const LONDON_CENTER: LngLat = [-81.2453, 42.9849];

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

export function inCampus([lng, lat]: LngLat) {
  return (
    lng >= CAMPUS_BBOX.west &&
    lng <= CAMPUS_BBOX.east &&
    lat >= CAMPUS_BBOX.south &&
    lat <= CAMPUS_BBOX.north
  );
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
