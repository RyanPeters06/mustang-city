"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { SPRING_UI } from "@/lib/motion";

const KEY = "mc.onboarded.v2"; // v2: the region / daily / leaderboard loop

type Target = "regions" | "missions" | "crew" | null;
const STEPS: { title: string; body: string; target: Target }[] = [
  { title: "Forest State is fogged", body: "Mustang City (Western's campus, inside the gold line) starts explored. Walk anywhere else and the fog clears.", target: null },
  { title: "Claim all 42 regions", body: "Each neighbourhood has 4 quests: set foot, explore, a local café, a signature spot. Do 3 and the whole region's fog lifts.", target: "regions" },
  { title: "Three dailies a day", body: "Fresh quests every day. Do one to keep your streak alive, all three for bonus Rep.", target: "missions" },
  { title: "Beat your crew", body: "Every region you claim counts for you and your faculty on the leaderboard.", target: "crew" },
];

/** Coach-mark ring positions, in the app frame (HUD stat top-right; tab bar items bottom). */
const RING: Record<Exclude<Target, null>, React.CSSProperties> = {
  regions: { top: "calc(var(--safe-top) + 6px)", right: "14px", width: 76, height: 48 },
  missions: { bottom: "calc(var(--safe-bottom) + 12px)", left: "calc(37.5% - 34px)", width: 68, height: 56 },
  crew: { bottom: "calc(var(--safe-bottom) + 12px)", left: "calc(62.5% - 34px)", width: 68, height: 56 },
};

/** First-run pointers: three short cards after the first landing. Skippable, shown once per phone. */
export default function Onboarding({ ready }: { ready: boolean }) {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    if (!ready) return;
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {
      return;
    }
    const t = setTimeout(() => setStep(0), 900);
    return () => clearTimeout(t);
  }, [ready]);

  const done = () => {
    setStep(null);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const target = step !== null ? STEPS[step].target : null;

  return (
    <AnimatePresence>
      {target && (
        <motion.span
          key={`ring-${target}`}
          aria-hidden
          className="pointer-events-none absolute z-40 rounded-[18px] ring-2 ring-gold shadow-[0_0_24px_rgba(255,200,87,0.55)]"
          style={RING[target]}
          initial={{ opacity: 0, scale: 1.25 }}
          animate={{ opacity: [0.4, 1, 0.4], scale: 1 }}
          // exit carries its own finite transition: the looping pulse would otherwise never let it unmount
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          transition={{ opacity: { duration: 1.6, repeat: Infinity }, scale: { duration: 0.35 } }}
        />
      )}
      {step !== null && (
        <motion.div
          key="onboarding"
          className="glass-solid absolute inset-x-4 z-40 rounded-[24px] p-5"
          style={{ bottom: "calc(var(--safe-bottom) + 96px)" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ ...SPRING_UI }}
          role="dialog"
          aria-label="Getting started"
        >
          <div className="flex items-center gap-1.5" aria-hidden>
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-gold" : "w-1.5 bg-white/25"}`} />
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
              <p className="mt-3 text-[20px] font-bold text-ink">{STEPS[step].title}</p>
              <p className="mt-1 text-[14px] leading-snug text-ink/75">{STEPS[step].body}</p>
            </motion.div>
          </AnimatePresence>
          <div className="mt-4 flex items-center justify-between">
            <button type="button" onClick={done} className="min-h-[44px] px-1 text-[14px] font-semibold text-ink/60">
              Skip
            </button>
            <button
              type="button"
              onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : done())}
              className="btn-sunset min-h-[44px] rounded-full px-6 text-[16px] font-bold"
            >
              {step < STEPS.length - 1 ? "Next" : "Let's go"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
