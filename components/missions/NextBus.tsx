"use client";

import { useEffect, useState } from "react";
import { LTC, routeById } from "@/lib/ltcData";
import { distanceM, type LngLat } from "@/lib/geo";

type Arrival = { route: string; stop: string; at: number };

/** "Next bus" line for a mission: nearest LTC stops within 450 m, live arrivals from TripUpdates. */
export default function NextBus({ at }: { at: LngLat }) {
  const stops = LTC.stops
    .map((s) => ({ ...s, d: distanceM(at, s.lngLat) }))
    .filter((s) => s.d < 450)
    .sort((a, b) => a.d - b.d)
    .slice(0, 2);
  const key = stops.map((s) => s.id).join(",");
  const [res, setRes] = useState<{ arrivals: Arrival[]; status: string; now: number } | null>(null);

  useEffect(() => {
    if (!key) return;
    let alive = true;
    const load = () =>
      fetch(`/api/arrivals?stops=${key}`)
        .then((r) => r.json())
        .then((j) => alive && setRes({ ...j, now: Date.now() }))
        .catch(() => alive && setRes({ arrivals: [], status: "unavailable", now: Date.now() }));
    void load();
    const t = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [key]);

  if (!stops.length) return null;
  const next = res?.arrivals[0];
  const stopName = (id: string) => stops.find((s) => s.id === id)?.name ?? "nearby stop";
  return (
    <div className="hud-panel flex items-center gap-3 px-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center" style={{ background: next ? (routeById(next.route)?.color ?? "#2ee6d6") : "rgba(255,255,255,0.08)" }}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={next ? "#140a2e" : "#f6efff"} strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M6 4h12a2 2 0 0 1 2 2v10H4V6a2 2 0 0 1 2-2z M4 11h16 M7 19v-3 M17 19v-3" />
        </svg>
      </span>
      <span className="min-w-0 text-[13px] leading-snug">
        {!res ? (
          <span className="text-ink/60">Checking buses…</span>
        ) : next ? (
          <>
            <span className="block font-bold text-ink">
              Route {routeById(next.route)?.name ?? next.route} in {Math.max(0, Math.round((next.at - res.now) / 60_000))} min
              {res.status === "delayed" && <span className="font-normal text-gold"> · delayed feed</span>}
              {res.status === "simulated" && <span className="font-normal text-gold"> · simulated</span>}
            </span>
            <span className="block truncate text-ink/60">{stopName(next.stop)} · {Math.round(stops.find((s) => s.id === next.stop)?.d ?? 0)} m from here</span>
          </>
        ) : (
          <>
            <span className="block font-bold text-ink">{stops[0].name}</span>
            <span className="block text-ink/60">{res.status === "unavailable" ? "Live arrivals unavailable right now" : "No buses due soon"}</span>
          </>
        )}
      </span>
    </div>
  );
}
