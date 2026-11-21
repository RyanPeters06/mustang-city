"use client";

import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";
import { getServerWeather, getWeather, subscribeWeather } from "@/lib/weather";

export default function Hud({ visible = true }: { visible?: boolean }) {
  const { rep, rank, pct } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const w = useSyncExternalStore(subscribeWeather, getWeather, getServerWeather);

  return (
    <header
      className={`ui-chrome pointer-events-none absolute inset-x-0 top-0 z-20 px-4 transition-all duration-700 ${visible ? "" : "-translate-y-4 opacity-0"}`}
      style={{ paddingTop: "calc(var(--safe-top) + 8px)" }}
    >
      <div className="glass pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-[22px] px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-[0.18em] text-gold uppercase">
            {rank}
            {w.status === "live" && w.tempC !== null && (
              <span className="text-ink/55">
                {" "}· {Math.round(w.tempC)}°C {w.label}
              </span>
            )}
          </p>
          <p className="font-display text-[22px] leading-none tracking-[0.02em] text-ink uppercase">Forest State</p>
        </div>
        <Stat label="Rep" value={rep.toLocaleString()} color="text-gold" />
        <div className="h-8 w-px bg-white/10" />
        <Stat label="Explored" value={`${pct < 10 ? pct.toFixed(2) : pct.toFixed(1)}%`} color="text-teal" />
      </div>
    </header>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-right">
      <p className={`text-[18px] leading-tight font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] font-medium tracking-[0.08em] text-ink/55 uppercase">{label}</p>
    </div>
  );
}
