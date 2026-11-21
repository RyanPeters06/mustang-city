"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { MISSIONS, TYPE_LABEL, CATEGORY_LABEL } from "@/lib/missions";
import { distanceM } from "@/lib/geo";
import { isRevealedAt } from "@/lib/fog";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";
import type { BuildingTap } from "../map/MapView";
import { TYPE_COLOR } from "../missions/MissionList";
import { getSchedule, getServerSchedule, subscribeSchedule } from "@/lib/schedule";

type History = { title: string; extract: string; url: string; note?: string };

type Props = {
  building: BuildingTap;
  routed: { distanceM: number; minutes: number } | null;
  onWaypoint: (on: boolean) => void;
  onOpenMission: (slug: string) => void;
  onOpenSchedule: () => void;
};
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BuildingDetail({ building, routed, onWaypoint, onOpenMission, onOpenSchedule }: Props) {
  const { completions } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { meetings } = useSyncExternalStore(subscribeSchedule, getSchedule, getServerSchedule);
  const classes = building.name ? meetings.filter((m) => m.building === building.name) : [];
  const [history, setHistory] = useState<History | null | "loading">(building.name ? "loading" : null);

  useEffect(() => {
    if (!building.name) return;
    let alive = true;
    fetch(`/api/building?name=${encodeURIComponent(building.name)}`)
      .then((r) => r.json())
      .then((j: { history: History | null }) => alive && setHistory(j.history))
      .catch(() => alive && setHistory(null));
    return () => {
      alive = false;
    };
  }, [building.name]);

  const explored = isRevealedAt(building.center[1], building.center[0]);
  const here = MISSIONS.filter((m) => distanceM(m.lngLat, building.center) <= 90);
  const h = "mb-2 text-[12px] font-semibold tracking-[0.14em] text-ink/60 uppercase";

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-teal/15 px-2.5 py-1 text-[12px] font-semibold text-teal">Mustang City</span>
        <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${explored ? "bg-gold/15 text-gold" : "bg-white/[0.07] text-ink/60"}`}>
          {explored ? "Explored" : "Not explored yet"}
        </span>
      </div>

      {!building.name && <p className="text-[14px] text-ink/60">This building isn&apos;t named on the map yet.</p>}

      {history === "loading" && <div className="h-24 animate-pulse rounded-2xl bg-white/5" />}
      {history && history !== "loading" && (
        <section className="hud-panel p-4">
          <p className="text-[12px] font-bold tracking-[0.14em] text-gold uppercase">{history.note ?? "History"}</p>
          <p className="mt-1.5 text-[14px] leading-snug text-ink/85">{history.extract}</p>
          {history.url && (
            <a href={history.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[12px] font-semibold text-teal underline">
              Source: Wikipedia — {history.title}
            </a>
          )}
        </section>
      )}

      <section>
        <h3 className={h}>Missions here</h3>
        {here.length === 0 ? (
          <p className="text-[14px] text-ink/60">No jobs from The Goose at this building. Yet.</p>
        ) : (
          <ul className="space-y-2">
            {here.map((m) => {
              const kind = m.category ? "landmark" : m.type;
              return (
                <li key={m.slug}>
                  <button type="button" onClick={() => onOpenMission(m.slug)} className="hud-panel flex min-h-[60px] w-full items-center gap-3 p-3 text-left active:bg-white/10">
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[12px] font-bold tracking-[0.14em] uppercase ${TYPE_COLOR[kind]}`}>
                        {m.category ? CATEGORY_LABEL[m.category] : TYPE_LABEL[m.type]}
                      </span>
                      <span className="block truncate text-[16px] font-bold text-ink">{m.title}</span>
                    </span>
                    <span className={`text-[14px] font-bold ${completions[m.slug] ? "text-teal" : "text-orange"}`}>
                      {completions[m.slug] ? "✓ Done" : `+${m.rep}`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className={h}>Your classes here</h3>
        {classes.length ? (
          <ul className="space-y-2">
            {classes.map((c) => (
              <li key={c.id} className="hud-panel flex items-center justify-between px-3.5 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-[16px] font-semibold text-ink">{c.course}</span>
                  <span className="block text-[12px] text-ink/60">
                    {c.days.map((d) => DAYS[d]).join(", ")} · {c.start}
                    {c.room ? ` · ${c.room}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <button type="button" onClick={onOpenSchedule} className="hud-panel flex min-h-[56px] w-full items-center justify-between px-4 text-left">
            <span className="text-[14px] text-ink/75">Add your schedule to see classes here</span>
            <span className="text-[20px] text-teal" aria-hidden>›</span>
          </button>
        )}
      </section>

      <button
        type="button"
        onClick={() => onWaypoint(!routed)}
        className={`flex min-h-[52px] w-full items-center justify-center rounded-full text-[16px] font-bold ${routed ? "border border-white/12 bg-white/[0.06] text-ink" : "btn-sunset"}`}
      >
        {routed ? `Clear waypoint · ${Math.round(routed.distanceM / 10) * 10} m · ${routed.minutes} min` : "Set waypoint"}
      </button>
    </div>
  );
}
