import "server-only";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { LTC } from "./ltcData";

/** LTC GTFS-realtime (londontransit.ca/open-data). Fetched server-side only, cached, last-good kept. */
const VEHICLES_URL = "https://gtfs.ltconline.ca/Vehicle/VehiclePositions.pb";
const TRIPS_URL = "https://gtfs.ltconline.ca/TripUpdate/TripUpdates.pb";
const FRESH_MS = 15_000;

export type Vehicle = { id: string; route: string; lngLat: [number, number]; bearing: number | null; ts: number };
export type Arrival = { route: string; stop: string; at: number };
type Feed<T> = { data: T; fetchedAt: number } | null;

let vehicles: Feed<Vehicle[]> = null;
let trips: Feed<Arrival[]> = null;
const fixture = () => process.env.LTC_FIXTURE === "1" && process.env.NODE_ENV !== "production";

// gtfs.ltconline.ca resets TLS handshakes from many networks but serves the same public feed over
// plain HTTP. We fetch server-side (no mixed content, nothing secret), so try HTTPS, then HTTP,
// and remember which one worked.
let preferHttp = false;
async function fetchOnce(url: string) {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`LTC ${res.status}`);
  return GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(await res.arrayBuffer()));
}
async function fetchFeed(url: string) {
  const http = url.replace(/^https:/, "http:");
  if (preferHttp) return fetchOnce(http);
  try {
    return await fetchOnce(url);
  } catch {
    const feed = await fetchOnce(http);
    preferHttp = true;
    return feed;
  }
}
const num = (v: unknown) => (typeof v === "number" ? v : v && typeof v === "object" && "toNumber" in v ? (v as { toNumber(): number }).toNumber() : 0);

/** Dev-only simulation: buses gliding along real route shapes (clearly labelled "simulated"). */
function simulated(): Vehicle[] {
  const t = Date.now() / 1000;
  return LTC.shapes.flatMap((s, i) =>
    [0, 0.5].map((off) => {
      const k = ((t / 900 + off + i * 0.137) % 1) * (s.line.length - 1);
      const a = s.line[Math.floor(k)];
      const b = s.line[Math.min(s.line.length - 1, Math.floor(k) + 1)];
      const f = k - Math.floor(k);
      const brg = (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI;
      return { id: `sim-${i}-${off}`, route: s.route, lngLat: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f] as [number, number], bearing: brg, ts: Date.now() };
    }),
  );
}

export async function getVehicles(): Promise<{ vehicles: Vehicle[]; status: "live" | "delayed" | "simulated" | "unavailable"; ageSec: number | null }> {
  if (fixture()) return { vehicles: simulated(), status: "simulated", ageSec: 0 };
  if (!vehicles || Date.now() - vehicles.fetchedAt > FRESH_MS) {
    try {
      const feed = await fetchFeed(VEHICLES_URL);
      const data: Vehicle[] = [];
      for (const e of feed.entity) {
        const v = e.vehicle;
        if (!v?.position) continue;
        data.push({
          id: v.vehicle?.id ?? e.id,
          route: v.trip?.routeId ?? "",
          lngLat: [v.position.longitude, v.position.latitude],
          bearing: v.position.bearing ?? null,
          ts: num(v.timestamp) * 1000 || Date.now(),
        });
      }
      vehicles = { data, fetchedAt: Date.now() };
    } catch (err) {
      console.error("LTC vehicles", (err as Error).message);
      if (!vehicles) return { vehicles: [], status: "unavailable", ageSec: null };
      return { vehicles: vehicles.data, status: "delayed", ageSec: Math.round((Date.now() - vehicles.fetchedAt) / 1000) };
    }
  }
  return { vehicles: vehicles.data, status: "live", ageSec: Math.round((Date.now() - vehicles.fetchedAt) / 1000) };
}

/** Upcoming arrivals at the given stops from TripUpdates (soonest first). */
export async function getArrivals(stopIds: string[]): Promise<{ arrivals: Arrival[]; status: "live" | "delayed" | "simulated" | "unavailable" }> {
  if (fixture()) {
    const now = Date.now();
    return { arrivals: stopIds.slice(0, 1).flatMap((s, i) => [{ route: "02", stop: s, at: now + (4 + i) * 60_000 }, { route: "06", stop: s, at: now + 11 * 60_000 }]), status: "simulated" };
  }
  let status: "live" | "delayed" = "live";
  if (!trips || Date.now() - trips.fetchedAt > FRESH_MS) {
    try {
      const feed = await fetchFeed(TRIPS_URL);
      const data: Arrival[] = [];
      for (const e of feed.entity) {
        const tu = e.tripUpdate;
        if (!tu) continue;
        for (const st of tu.stopTimeUpdate ?? []) {
          const at = num(st.arrival?.time ?? st.departure?.time) * 1000;
          if (at && st.stopId) data.push({ route: tu.trip?.routeId ?? "", stop: st.stopId, at });
        }
      }
      trips = { data, fetchedAt: Date.now() };
    } catch (err) {
      console.error("LTC trips", (err as Error).message);
      if (!trips) return { arrivals: [], status: "unavailable" };
      status = "delayed";
    }
  }
  const now = Date.now();
  const want = new Set(stopIds);
  return { arrivals: trips!.data.filter((a) => want.has(a.stop) && a.at > now - 60_000).sort((a, b) => a.at - b.at).slice(0, 4), status };
}
