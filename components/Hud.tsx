"use client";

import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";
import { getServerWeather, getWeather, subscribeWeather } from "@/lib/weather";
import { DISTRICTS } from "@/lib/districts";
import { FLAME_PATH } from "./missions/DailyCard";
import { getServerWanted, getWanted, subscribeWanted } from "@/lib/wanted";
import { AnimatePresence, motion } from "motion/react";

export default function Hud({ visible = true }: { visible?: boolean }) {
  const { rep, rank, regionsClaimed, streak, bag, bagSize } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const w = useSyncExternalStore(subscribeWeather, getWeather, getServerWeather);
  const wanted = useSyncExternalStore(subscribeWanted, getWanted, getServerWanted);

  return (
    <header
      className={`ui-chrome pointer-events-none absolute inset-x-0 top-0 z-20 px-4 transition-all duration-700 ${visible ? "" : "-translate-y-4 opacity-0"}`}
      style={{ paddingTop: "calc(var(--safe-top) + 8px)" }}
    >
      {/* Rank perks: Made gets a gold-trimmed HUD, Legend a glowing title (lib/rank.ts RANK_PERKS) */}
      <div className={`glass pointer-events-auto relative flex items-center gap-2.5 overflow-hidden rounded-[18px] px-3 py-1.5 ${rank === "Made" || rank === "Legend of Forest State" ? "ring-1 ring-gold/50" : ""}`}>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[10px] font-bold tracking-[0.14em] whitespace-nowrap text-gold uppercase ${rank === "Legend of Forest State" ? "drop-shadow-[0_0_6px_rgba(255,200,87,0.9)]" : ""}`}>
            {rank}
            {streak > 0 && (
              <span className="ml-1.5 inline-flex items-center gap-0.5 text-orange" aria-label={`${streak}-day streak`}>
                <svg viewBox="0 0 24 24" className="-mt-0.5 h-3.5 w-3.5" fill="currentColor" aria-hidden><path d={FLAME_PATH} /></svg>
                {streak}
              </span>
            )}
            <WantedStars />
            {!wanted && w.status === "live" && w.tempC !== null && (
              <span className="text-ink/60">
                {" "}· {Math.round(w.tempC)}°C {w.label}
              </span>
            )}
          </p>
          <p className="font-display text-[16px] leading-none tracking-[0.02em] whitespace-nowrap text-ink uppercase">Forest State</p>
        </div>
        {bag.length > 0 && (
          <>
            <Stat label="Bag" value={`${bag.length}/${bagSize}`} color={bag.length >= bagSize ? "text-pink" : "text-ink"} />
            <div className="h-6 w-px bg-white/10" />
          </>
        )}
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

const STAR = "M12 3l2.6 5.4 5.9.9-4.3 4.1 1 5.9L12 16.6 6.8 19.3l1-5.9L3.5 9.3l5.9-.9z";

/** Wanted level for curiosity (lib/wanted.ts): five stars that light up while you're on an exploring streak. */
function WantedStars() {
  const stars = useSyncExternalStore(subscribeWanted, getWanted, getServerWanted);
  return (
    <AnimatePresence>
      {stars > 0 && (
        <motion.span
          className="ml-1.5 inline-flex translate-y-[1px] gap-[2px]"
          aria-label={`Wanted level ${stars} of 5`}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.svg
              key={i}
              viewBox="0 0 24 24"
              className={`h-2.5 w-2.5 ${i < stars ? "text-gold drop-shadow-[0_0_4px_rgba(255,200,87,0.9)]" : "text-white/20"}`}
              fill="currentColor"
              aria-hidden
              animate={i < stars ? { scale: [1.5, 1] } : { scale: 1 }}
              transition={{ duration: 0.35 }}
            >
              <path d={STAR} />
            </motion.svg>
          ))}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
