"use client";

import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";

export default function Hud({ visible = true }: { visible?: boolean }) {
  const { rep, rank, pct } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <header
      className={`ui-chrome pointer-events-none absolute inset-x-0 top-0 z-20 px-4 transition-all duration-700 ${visible ? "" : "-translate-y-4 opacity-0"}`}
      style={{ paddingTop: "calc(var(--safe-top) + 8px)" }}
    >
      <div
        className="glass pointer-events-auto relative flex items-center gap-3 overflow-hidden px-4 py-2.5"
        style={{ clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)" }}
      >
        <div className="sunset-rule absolute inset-x-0 bottom-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-gold uppercase">{rank}</p>
          <p className="font-display text-[22px] leading-none tracking-[0.02em] text-ink uppercase">Forest State</p>
        </div>
        <Stat label="Rep" value={rep.toLocaleString()} color="text-orange" />
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
      <p className="text-[10px] font-semibold tracking-[0.15em] text-ink/60 uppercase">{label}</p>
    </div>
  );
}
