"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { SPRING_UI } from "@/lib/motion";

const KEY = "mc.onboarded.v1";
const STEPS = [
  { title: "Mustang City is yours", body: "Western's campus, inside the gold line, starts explored. Everything else in Forest State is fog." },
  { title: "Walk to clear the fog", body: "Turn on location and wherever you walk in London clears. Every street you uncover earns Rep." },
  { title: "Jobs from The Goose", body: "Missions pay Rep and raise your rank. Tap any building or neighbourhood to see what's there." },
];

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

  return (
    <AnimatePresence>
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
