"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getReplayState, getServerReplayState, stopReplay, subscribeReplay } from "@/lib/replay";

/** Shown while a replay is driving the map: speed, progress, Stop. */
export default function ReplayBar() {
  const { playing, speed, progress } = useSyncExternalStore(subscribeReplay, getReplayState, getServerReplayState);
  return (
    <AnimatePresence>
      {playing && (
        <motion.div
          key="replay"
          className="absolute inset-x-0 z-20 px-4"
          style={{ top: "calc(var(--safe-top) + 74px)" }}
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
        >
          <div className="glass flex items-center gap-3 rounded-2xl py-2 pr-2 pl-4" role="status">
            <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-pink" />
            <span className="text-[12px] font-bold tracking-[0.18em] text-pink uppercase">Replay</span>
            <span className="text-[12px] font-bold text-ink/70 tabular-nums">{speed}×</span>
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-pink to-gold" style={{ width: `${progress * 100}%` }} />
            </div>
            <button type="button" onClick={stopReplay} className="min-h-[36px] rounded-full bg-white/10 px-3.5 text-[12px] font-bold text-ink">
              Stop
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
