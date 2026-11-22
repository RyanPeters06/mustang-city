"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";
import { DISTRICTS, getDistrictStats } from "@/lib/districts";
import { CLAIM_NEEDED, regionCenter, regionProgress } from "@/lib/regions";
import { dailyQuests, dayKey } from "@/lib/daily";
import { useLastFix } from "@/lib/useLastFix";
import { CAMPUS_CENTER, distanceM } from "@/lib/geo";
import { FLAME_PATH } from "./missions/DailyCard";

type Nudge = { key: string; text: string; sub: string; region?: string; tone: "gold" | "orange" };

/**
 * Near-miss nudge under the HUD: the one thing that's closest to paying off right now.
 * "Masonville · 1 quest to claim" beats a generic "go explore". Dismissable per session.
 */
export default function NudgeChip({ onOpenRegion, hidden }: { onOpenRegion: (name: string) => void; hidden: boolean }) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const fix = useLastFix(5000);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const nudge = useMemo<Nudge | null>(() => {
    const day = dayKey();
    const doneToday = dailyQuests(day).some((q) => snap.dailyDone[`${day}|${q.id}`]);
    const hour = new Date().getHours();
    // Streak at risk in the evening beats everything.
    if (snap.streak > 0 && !doneToday && hour >= 17)
      return { key: `streak-${day}`, text: `Keep your ${snap.streak}-day streak`, sub: "Do one daily quest before midnight", tone: "orange" };

    const stats = getDistrictStats();
    const input = { visits: snap.visits, checkins: snap.checkins, completions: snap.completions, finds: snap.finds };
    const origin = fix?.lngLat ?? CAMPUS_CENTER;
    let best: { name: string; left: number; dist: number } | null = null;
    for (const d of DISTRICTS) {
      if (snap.districts[d.name]) continue;
      const p = regionProgress(d.name, input, stats);
      if (p.count === 0) continue;
      const left = CLAIM_NEEDED - p.count;
      const c = regionCenter(d.name);
      const dist = c ? distanceM(origin, c) : 0;
      if (!best || left < best.left || (left === best.left && dist < best.dist)) best = { name: d.name, left, dist };
    }
    if (best) return { key: `region-${best.name}-${best.left}`, text: best.name, sub: best.left === 1 ? "1 quest to claim it" : `${best.left} quests to claim it`, region: best.name, tone: "gold" };
    return null;
  }, [snap, fix]);

  const show = nudge && !hidden && dismissed !== nudge.key;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={nudge.key}
          className="ui-chrome pointer-events-auto absolute left-1/2 z-20 -translate-x-1/2"
          style={{ top: "calc(var(--safe-top) + 64px)" }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
        >
          <div className="glass flex items-center gap-2 rounded-full py-1 pr-1 pl-3 shadow-lg">
            <button
              type="button"
              onClick={() => nudge.region && onOpenRegion(nudge.region)}
              className="flex min-h-[36px] items-center gap-2 text-left"
              aria-label={`${nudge.text}: ${nudge.sub}`}
            >
              {nudge.tone === "orange" ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-orange" fill="currentColor" aria-hidden>
                  <path d={FLAME_PATH} />
                </svg>
              ) : (
                <span className="h-2 w-2 animate-pulse rounded-full bg-gold" aria-hidden />
              )}
              <span className="text-[13px] leading-tight whitespace-nowrap">
                <span className="font-bold text-ink">{nudge.text}</span>
                <span className="text-ink/65"> · {nudge.sub}</span>
              </span>
            </button>
            <button type="button" onClick={() => setDismissed(nudge.key)} className="grid h-9 w-9 place-items-center rounded-full text-ink/50" aria-label="Dismiss">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
