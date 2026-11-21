"use client";

import { useState, useSyncExternalStore } from "react";
import { DISTRICTS, UNLOCK_SHARE, getDistrictStats, subscribeDistricts } from "@/lib/districts";
import type { ProgressSnapshot } from "@/lib/progress";

const noStats = () => [];

/** Profile → Neighbourhoods: unlocked count + progress toward 30% in each district. */
export default function Neighbourhoods({ snap }: { snap: ProgressSnapshot }) {
  const stats = useSyncExternalStore(subscribeDistricts, getDistrictStats, noStats);
  const [all, setAll] = useState(false);
  const unlocked = Object.keys(snap.districts).length;
  const rows = [...stats].sort((a, b) => Number(!!snap.districts[b.name]) - Number(!!snap.districts[a.name]) || b.pct - a.pct);
  const shown = all ? rows : rows.filter((r) => r.have > 0 || snap.districts[r.name]).slice(0, 6);

  return (
    <section>
      <h3 className="mb-2 text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">
        Neighbourhoods · {unlocked}/{DISTRICTS.length}
      </h3>
      {shown.length === 0 ? (
        <p className="text-[14px] text-ink/60">Explore {Math.round(UNLOCK_SHARE * 100)}% of a neighbourhood to unlock it.</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((r) => {
            const done = !!snap.districts[r.name];
            const toUnlock = Math.min(1, r.pct / UNLOCK_SHARE);
            return (
              <li key={r.name} className="rounded-2xl bg-white/[0.04] px-3 py-2.5">
                <div className="flex items-baseline justify-between">
                  <span className={`text-[14px] font-semibold ${done ? "text-gold" : "text-ink"}`}>{r.name}</span>
                  <span className="text-[12px] text-ink/60 tabular-nums">{done ? "Unlocked" : `${Math.round(r.pct * 100)}% / 30%`}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full ${done ? "bg-gold" : "bg-teal"}`} style={{ width: `${(done ? 1 : toUnlock) * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" onClick={() => setAll((a) => !a)} className="mt-1 inline-flex min-h-[44px] items-center text-[12px] font-semibold text-teal underline">
        {all ? "Show fewer" : `Show all ${DISTRICTS.length}`}
      </button>
      <p className="mt-1 text-[12px] text-ink/60">Boundaries: City of London Open Data (Planning Districts)</p>
    </section>
  );
}
