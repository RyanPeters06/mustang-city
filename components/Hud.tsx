"use client";

import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";

export default function Hud() {
  const { rep, rank, pct } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <header
      className="ui-chrome pointer-events-none absolute inset-x-0 top-0 z-20 px-4"
      style={{ paddingTop: "calc(var(--safe-top) + 8px)" }}
    >
      <div className="glass pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-gold uppercase">{rank}</p>
          <p className="font-display text-[22px] leading-none text-ink uppercase">Forest State</p>
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
