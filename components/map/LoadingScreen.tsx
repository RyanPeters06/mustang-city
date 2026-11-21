"use client";

import { AnimatePresence, motion } from "motion/react";

type Props = { state: "loading" | "ready" | "unavailable"; reason?: string };

const REASONS: Record<string, string> = {
  "missing-token": "Map token isn't configured for this deployment.",
  "bad-token": "The map token was rejected.",
  webgl: "This device can't draw the 3D map.",
};

export default function LoadingScreen({ state, reason }: Props) {
  return (
    <AnimatePresence>
      {state !== "ready" && (
        <motion.div
          key="loader"
          className="absolute inset-0 z-[25] flex flex-col items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background:
              "radial-gradient(120% 60% at 50% 110%, #ff8a3d 0%, #ff4f8b 30%, #7b2ff7 58%, #140a2e 85%)",
          }}
        >
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1/2"
            style={{ background: "linear-gradient(180deg, transparent, #000 85%)" }}
          />
          <p className="relative text-[12px] font-semibold tracking-[0.35em] text-teal uppercase">Forest State</p>
          <h1 className="font-display relative mt-2 text-center text-[56px] leading-[0.9] text-ink uppercase drop-shadow-[0_4px_24px_rgba(255,79,139,0.7)]">
            Mustang
            <br />
            City
          </h1>
          {state === "loading" ? (
            <div className="relative mt-10 h-1 w-40 overflow-hidden rounded-full bg-white/15">
              <motion.div
                className="h-full w-1/3 rounded-full bg-gradient-to-r from-pink to-gold"
                animate={{ x: ["-100%", "300%"] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              />
            </div>
          ) : (
            <div className="glass relative mx-8 mt-10 rounded-2xl px-5 py-4 text-center">
              <p className="text-[15px] font-semibold text-ink">Map unavailable</p>
              <p className="mt-1 text-[13px] text-ink/70">{REASONS[reason ?? ""] ?? "Something went wrong loading the map."}</p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
