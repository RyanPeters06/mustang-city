"use client";

import { useState, useSyncExternalStore } from "react";
import { DISTRICTS, getDistrictStats, subscribeDistricts } from "@/lib/districts";
import type { ProgressSnapshot } from "@/lib/progress";
import { CLAIM_NEEDED, regionCenter, regionProgress } from "@/lib/regions";
import { CAMPUS_CENTER, distanceM, type LngLat } from "@/lib/geo";

const noStats = () => [];
const fmtDist = (m: number) => (m < 950 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);

/**
 * Regions progress: "3/42 claimed" plus a list of regions with their quest progress.
 * `nearest` (Missions tab): unclaimed regions closest to you first, tap to open its quest board.
 * `all` (Profile): claimed first, then the ones you're furthest into.
 */
export default function RegionsBoard({
  snap,
  from = null,
  mode,
  onOpen,
}: {
  snap: ProgressSnapshot;
  from?: LngLat | null;
  mode: "nearest" | "all";
  onOpen?: (name: string) => void;
}) {
  const stats = useSyncExternalStore(subscribeDistricts, getDistrictStats, noStats);
  const [expanded, setExpanded] = useState(false);
  const input = { visits: snap.visits, checkins: snap.checkins, completions: snap.completions, finds: snap.finds };
  const claimed = snap.regionsClaimed;

  const rows = DISTRICTS.map((d) => {
    const p = regionProgress(d.name, input, stats);
    const c = regionCenter(d.name);
    // Without GPS, "near you" means near campus: every Western student starts there.
    const origin = from ?? CAMPUS_CENTER;
    return { name: d.name, count: p.count, claimed: !!snap.districts[d.name], dist: c ? distanceM(origin, c) : null };
  });

  const sorted =
    mode === "nearest"
      ? rows.filter((r) => !r.claimed).sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0) || b.count - a.count)
      : rows.sort((a, b) => Number(b.claimed) - Number(a.claimed) || b.count - a.count || a.name.localeCompare(b.name));
  const shown = expanded ? sorted : sorted.slice(0, mode === "nearest" ? 4 : 6);

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">{mode === "nearest" ? "Regions near you" : "Regions"}</h3>
        <span className="text-[12px] font-semibold text-gold tabular-nums">
          {claimed}/{DISTRICTS.length} claimed
        </span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div className="h-full rounded-full bg-gradient-to-r from-gold to-orange" style={{ width: `${(claimed / DISTRICTS.length) * 100}%` }} />
      </div>
      <ul className="space-y-2">
        {shown.map((r) => {
          const body = (
            <>
              <span className="min-w-0">
                <span className={`block truncate text-[15px] font-semibold ${r.claimed ? "text-gold" : "text-ink"}`}>{r.name}</span>
                <span className="block text-[12px] text-ink/55">
                  {r.claimed ? "Claimed" : `${r.count}/4 quests · ${CLAIM_NEEDED} to claim`}
                  {r.dist != null && !r.claimed ? ` · ${fmtDist(r.dist)}${from ? "" : " from campus"}` : ""}
                </span>
              </span>
              <span className="flex shrink-0 gap-1" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={`h-2 w-2 rounded-full ${i < r.count ? (r.claimed ? "bg-gold" : "bg-orange") : "bg-white/15"}`} />
                ))}
              </span>
            </>
          );
          return (
            <li key={r.name}>
              {onOpen ? (
                <button type="button" onClick={() => onOpen(r.name)} className="hud-panel flex min-h-[52px] w-full items-center justify-between gap-3 px-3 py-2.5 text-left">
                  {body}
                </button>
              ) : (
                <div className="flex min-h-[52px] items-center justify-between gap-3 rounded-2xl bg-white/[0.04] px-3 py-2.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {sorted.length > shown.length || expanded ? (
        <button type="button" onClick={() => setExpanded((e) => !e)} className="mt-1 inline-flex min-h-[44px] items-center text-[12px] font-semibold text-teal underline">
          {expanded ? "Show fewer" : `Show all ${sorted.length}`}
        </button>
      ) : null}
      {mode === "all" && <p className="mt-1 text-[12px] text-ink/60">About this map: map © Mapbox, © OpenStreetMap contributors. Boundaries: City of London Open Data (Planning Districts). Places: © OpenStreetMap contributors.</p>}
    </section>
  );
}
