import type { LineString } from "geojson";
import type { LngLat } from "./geo";

export type Route = { geometry: LineString; distanceM: number; minutes: number };

/** Walking route via the Mapbox Directions API (public token, client-side). */
export async function walkingRoute(from: LngLat, to: LngLat): Promise<Route> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const coords = `${from[0]},${from[1]};${to[0]},${to[1]}`;
  const res = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/walking/${coords}?geometries=geojson&overview=full&access_token=${token}`,
  );
  if (!res.ok) throw new Error(`directions ${res.status}`);
  const json = (await res.json()) as { routes?: { geometry: LineString; distance: number; duration: number }[] };
  const r = json.routes?.[0];
  if (!r) throw new Error("no route");
  return { geometry: r.geometry, distanceM: r.distance, minutes: Math.max(1, Math.round(r.duration / 60)) };
}
