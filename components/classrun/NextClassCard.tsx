"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { buildingAt, getSchedule, getServerSchedule, nextClass, subscribeSchedule } from "@/lib/schedule";
import { getLastFix } from "@/lib/location";
import { distanceM, type LngLat } from "@/lib/geo";

/** "Next class" card ~25 min before a class: course, building, time, walking minutes, one-tap waypoint. */
export default function NextClassCard({ onWaypoint, routed }: { onWaypoint: (key: string | null, to?: LngLat) => void; routed: string | null }) {
  useSyncExternalStore(subscribeSchedule, getSchedule, getServerSchedule);
  const [now, setNow] = useState(() => new Date(0));
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);
  if (!now.getTime()) return null;
  const n = nextClass(now);
  if (!n) return null;
  const where = buildingAt(n.meeting.building);
  const mins = Math.round((n.startsAt.getTime() - now.getTime()) / 60_000);
  const fix = getLastFix();
  const walk = where && fix ? Math.max(1, Math.round(distanceM(fix.lngLat, where) / 80)) : null; // ~4.8 km/h
  const key = `class:${n.meeting.id}`;
  const on = routed === key;

  return (
    <div
      className="glass pointer-events-auto absolute left-4 z-20 max-w-[calc(100%-132px)] px-3 py-2.5"
      style={{ top: "calc(var(--safe-top) + 84px)" }}
    >
      <p className="text-[12px] font-bold tracking-[0.14em] text-teal uppercase">{n.done ? "Class Run ✓ on time" : mins >= 0 ? `Next class · ${mins} min` : "Class started"}</p>
      <p className="truncate text-[16px] font-bold text-ink">{n.meeting.course}</p>
      <p className="truncate text-[12px] text-ink/65">
        {n.meeting.building || n.meeting.room || "Building not set"} · {n.meeting.start}
        {walk !== null && ` · ${walk} min walk`}
      </p>
      {where && !n.done && (
        <button type="button" onClick={() => onWaypoint(on ? null : key, where)} className="mt-1.5 min-h-[44px] text-[12px] font-bold tracking-[0.14em] text-gold uppercase">
          {on ? "Clear waypoint" : "Set waypoint ›"}
        </button>
      )}
    </div>
  );
}
