"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { missionBySlug } from "@/lib/missions";
import type { PassedInfo } from "./MissionDetail";

/** Short synth sting via Web Audio (no audio assets; plays because it follows a user tap). */
function playSting() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 3 ? "triangle" : "sawtooth";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.09);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + (i === 3 ? 0.9 : 0.3));
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 1);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    /* audio unavailable — the visuals carry it */
  }
}

export default function MissionPassed({ info, onDone }: { info: PassedInfo | null; onDone: () => void }) {
  useEffect(() => {
    if (!info) return;
    playSting();
    const t = setTimeout(onDone, 3600);
    return () => clearTimeout(t);
  }, [info, onDone]);

  const m = info ? missionBySlug(info.slug) : null;

  return (
    <AnimatePresence>
      {info && m && (
        <motion.button
          type="button"
          key={info.slug}
          onClick={onDone}
          aria-label="Mission passed. Tap to continue"
          className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-6 text-center backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            background:
              "radial-gradient(80% 45% at 50% 48%, rgba(255,79,139,0.42), transparent 70%), radial-gradient(120% 60% at 50% 110%, rgba(255,138,61,0.35), transparent 60%), rgba(12,6,30,0.93)",
          }}
        >
          {/* light sweep */}
          <motion.div
            aria-hidden
            className="absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent"
            initial={{ x: "-150%" }}
            animate={{ x: "250%" }}
            transition={{ duration: 1.1, ease: "easeOut", delay: 0.15 }}
          />
          {info.thumb && (
            <motion.img
              src={info.thumb}
              alt=""
              className="mb-6 h-36 w-36 rounded-2xl object-cover shadow-2xl ring-4 ring-gold"
              initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: -4, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
            />
          )}
          <motion.h2
            className="font-display text-[64px] leading-[0.85] uppercase"
            style={{
              backgroundImage: "linear-gradient(180deg, #FFC857 0%, #FF8A3D 55%, #FF4F8B 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter: "drop-shadow(0 6px 24px rgba(255,79,139,0.6))",
            }}
            initial={{ scale: 1.6, opacity: 0, letterSpacing: "0.2em" }}
            animate={{ scale: 1, opacity: 1, letterSpacing: "0em" }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
          >
            Mission
            <br />
            Passed
          </motion.h2>
          <motion.p
            className="mt-4 text-[15px] font-semibold tracking-wide text-ink/85"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            {m.title}
          </motion.p>
          <motion.p
            className="mt-2 text-[34px] font-bold text-orange tabular-nums"
            initial={{ y: 16, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 16 }}
          >
            +{info.rep} REP
          </motion.p>
          {info.reason && (
            <motion.p className="mt-3 max-w-[30ch] text-[13px] text-ink/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
              {info.reason}
            </motion.p>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
