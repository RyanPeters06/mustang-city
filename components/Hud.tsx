"use client";

import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";
import { getServerWeather, getWeather, subscribeWeather } from "@/lib/weather";
import { DISTRICTS } from "@/lib/districts";
import { FLAME_PATH } from "./missions/DailyCard";

export default function Hud({ visible = true }: { visible?: boolean }) {
  const { rep, rank, regionsClaimed, streak } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const w = useSyncExternalStore(subscribeWeather, getWeather, getServerWeather);

  return (
    <header
      className={`ui-chrome pointer-events-none absolute inset-x-0 top-0 z-20 px-4 transition-all duration-700 ${visible ? "" : "-translate-y-4 opacity-0"}`}
      style={{ paddingTop: "calc(var(--safe-top) + 8px)" }}
    >
      <div className="glass pointer-events-auto relative flex items-center gap-2.5 overflow-hidden rounded-[18px] px-3 py-1.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold tracking-[0.14em] whitespace-nowrap text-gold uppercase">
            {rank}
            {streak > 0 && (
              <span className="ml-1.5 inline-flex items-center gap-0.5 text-orange" aria-label={`${streak}-day streak`}>
                <svg viewBox="0 0 24 24" className="-mt-0.5 h-3.5 w-3.5" fill="currentColor" aria-hidden><path d={FLAME_PATH} /></svg>
                {streak}
              </span>
            )}
            {w.status === "live" && w.tempC !== null && (
              <span className="text-ink/60">
                {" "}· {Math.round(w.tempC)}°C {w.label}
              </span>
            )}
          </p>
          <p className="font-display text-[16px] leading-none tracking-[0.02em] text-ink uppercase">Forest State</p>
        </div>
        <Stat label="Rep" value={rep.toLocaleString()} color="text-gold" />
        <div className="h-6 w-px bg-white/10" />
        {/* Headline progress: regions claimed through their quests (lib/regions.ts) */}
        <Stat label="Regions" value={`${regionsClaimed}/${DISTRICTS.length}`} color="text-teal" />
      </div>
    </header>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-right">
      <p className={`text-[16px] leading-tight font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] font-medium tracking-[0.14em] text-ink/60 uppercase">{label}</p>
    </div>
  );
}
