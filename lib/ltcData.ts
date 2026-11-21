/** LTC static GTFS (preprocessed by scripts/gtfs-build.mjs): routes, one shape per route+direction, stops near missions. */
import raw from "./data/ltc.json";
import type { LngLat } from "./geo";

export type Route = { id: string; name: string; long: string; color: string };
export type Shape = { route: string; dir: number; line: LngLat[] };
export type Stop = { id: string; code: string; name: string; lngLat: LngLat };

export const LTC = raw as { source: string; version: string; start: string; routes: Route[]; shapes: Shape[]; stops: Stop[] };
export const routeById = (id: string) => LTC.routes.find((r) => r.id === id);

/** Metres from p to the polyline. */
export function distToLine(p: LngLat, line: LngLat[]) {
  const k = Math.cos((p[1] * Math.PI) / 180);
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const [ax, ay, bx, by] = [line[i - 1][0] * k, line[i - 1][1], line[i][0] * k, line[i][1]];
    const [px, py] = [p[0] * k, p[1]];
    const dx = bx - ax;
    const dy = by - ay;
    const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
    best = Math.min(best, Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) * 111320);
  }
  return best;
}
