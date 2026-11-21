"use client";

import { useSyncExternalStore } from "react";
import { DISTRICTS, DISTRICT_REP, UNLOCK_SHARE, districtAt, getDistrictStats, subscribeDistricts } from "@/lib/districts";
import { MISSIONS, CATEGORY_LABEL, TYPE_LABEL } from "@/lib/missions";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";

const noStats = () => [];

/** Region card: shown when a neighbourhood is tapped (it rises out of the map). */
export default function DistrictDetail({ name, onOpenMission }: { name: string; onOpenMission: (slug: string) => void }) {
  const stats = useSyncExternalStore(subscribeDistricts, getDistrictStats, noStats);
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const stat = stats.find((s) => s.name === name);
  const d = DISTRICTS.find((x) => x.name === name);
  const unlocked = !!snap.districts[name];
  const pct = stat?.pct ?? 0;
  const toUnlock = Math.min(1, pct / UNLOCK_SHARE);
  const missions = MISSIONS.filter((m) => districtAt(m.lngLat) === name);

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2 text-[12px] font-bold tracking-[0.14em] uppercase">
        <span className={unlocked ? "text-gold" : "text-ink/60"}>{unlocked ? "Unlocked" : "Locked"}</span>
        <span className="text-ink/30">·</span>
        <span className="text-teal">{Math.round(pct * 100)}% explored</span>
      </div>

      <div className="hud-panel p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-semibold text-ink/80">{unlocked ? "District claimed" : `Clear ${Math.round(UNLOCK_SHARE * 100)}% to claim it`}</span>
          <span className="text-[13px] font-bold text-orange">+{DISTRICT_REP} Rep</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden bg-white/10">
          <div className={`h-full ${unlocked ? "bg-gold" : "bg-gradient-to-r from-pink to-orange"}`} style={{ width: `${(unlocked ? 1 : toUnlock) * 100}%` }} />
        </div>
        {d?.info?.startsWith("http") && (
          <a href={d.info} target="_blank" rel="noreferrer" className="mt-3 inline-block min-h-[44px] pt-3 text-[13px] font-semibold text-teal underline">
            City of London district profile
          </a>
        )}
      </div>

      <section>
        <h3 className="mb-2 text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">Jobs here · {missions.length}</h3>
        {missions.length === 0 ? (
          <p className="text-[14px] text-ink/60">No jobs from The Goose here yet. The fog still counts.</p>
        ) : (
          <ul className="space-y-2">
            {missions.map((m) => (
              <li key={m.slug}>
                <button
                  type="button"
                  onClick={() => onOpenMission(m.slug)}
                  className="hud-panel flex min-h-[52px] w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-ink">{m.title}</span>
                    <span className="block text-[12px] text-ink/50">{m.category ? CATEGORY_LABEL[m.category] : TYPE_LABEL[m.type]}</span>
                  </span>
                  <span className={`text-[13px] font-bold ${snap.completions[m.slug] ? "text-teal" : "text-orange"}`}>
                    {snap.completions[m.slug] ? "✓" : `+${m.rep}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
