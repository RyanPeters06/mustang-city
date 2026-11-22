"use client";

import { useEffect, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { dismissCelebration, getCelebration, getServerCelebration, subscribeCelebrations } from "@/lib/celebrate";
import { SPRING_HERO, SPRING_UI } from "@/lib/motion";

function sting(rank: boolean) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;
    const notes = rank ? [392, 523.25, 659.25, 783.99, 1046.5] : [783.99, 1046.5];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, now + i * 0.08);
      g.gain.linearRampToValueAtTime(0.1, now + i * 0.08 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(now + i * 0.08);
      o.stop(now + i * 0.08 + 0.6);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* no audio */
  }
}

/** Plays queued celebrations: full-screen RANK UP, or a BADGE UNLOCKED banner. */
export default function Celebrations({ paused = false }: { paused?: boolean }) {
  const queued = useSyncExternalStore(subscribeCelebrations, getCelebration, getServerCelebration);
  // Wait for MISSION PASSED (or any other full-screen moment) to finish first.
  const c = paused ? null : queued;

  useEffect(() => {
    if (!c) return;
    sting(c.kind === "rank");
    const t = setTimeout(dismissCelebration, c.kind === "rank" ? 3200 : 2600);
    return () => clearTimeout(t);
  }, [c]);

  return (
    <AnimatePresence>
      {c?.kind === "rank" && (
        <motion.button
          key={c.id}
          type="button"
          onClick={dismissCelebration}
          aria-label={`Rank up: ${c.title}. Tap to continue`}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center px-6 text-center backdrop-blur-md"
          style={{ background: "radial-gradient(80% 45% at 50% 48%, rgba(255,200,87,0.4), transparent 70%), rgba(12,6,30,0.93)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.p
            className="text-[14px] font-bold tracking-[0.3em] text-teal uppercase"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            Rank up
          </motion.p>
          <motion.h2
            className="font-display mt-3 text-[58px] leading-[0.9] uppercase"
            style={{
              backgroundImage: "linear-gradient(180deg, #FFF1C9 0%, #FFC857 50%, #FF8A3D 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter: "drop-shadow(0 6px 24px rgba(255,200,87,0.55))",
            }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...SPRING_HERO }}
          >
            {c.title}
          </motion.h2>
          <motion.p className="mt-4 text-[16px] font-semibold text-ink/75" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            {c.subtitle}
          </motion.p>
        </motion.button>
      )}
      {(c?.kind === "badge" || c?.kind === "district" || c?.kind === "ride" || c?.kind === "collectible" || c?.kind === "class" || c?.kind === "daily" || c?.kind === "streak" || c?.kind === "loot" || c?.kind === "stash" || c?.kind === "surprise") && (
        <motion.button
          key={c.id}
          type="button"
          onClick={dismissCelebration}
          className="absolute inset-x-4 z-50"
          style={{ top: "calc(var(--safe-top) + 80px)" }}
          initial={{ y: -30, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ ...SPRING_UI }}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-night/[0.96] p-3 text-left shadow-2xl backdrop-blur-xl">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: c.color, boxShadow: `0 6px 24px -6px ${c.color}` }}>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#140A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={c.glyph} />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-[12px] font-bold tracking-[0.14em] text-gold uppercase">
                {c.kind === "district" ? "Region claimed" : c.kind === "daily" ? "Daily quest" : c.kind === "streak" ? "Streak" : c.kind === "loot" ? "Loot · in your bag" : c.kind === "stash" ? "Banked at the stash" : c.kind === "surprise" ? "Surprise found" : c.kind === "ride" ? "Ride logged" : c.kind === "collectible" ? "Collectible found" : c.kind === "class" ? "Class Run · on time" : "Badge unlocked"}
              </span>
              <span className="block truncate text-[16px] font-bold text-ink">{c.title}</span>
              <span className="block truncate text-[12px] text-ink/60">{c.subtitle}</span>
            </span>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
