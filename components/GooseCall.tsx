"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { getSnapshot, subscribe } from "@/lib/progress";
import { duckMusic } from "@/lib/music";
import GoosePortrait from "./missions/GoosePortrait";

const SEEN = "mc.goosecalls.v1";
type Phase = { region: string; stage: "ringing" | "talking" | "ended"; script?: string };

function calledBefore(region: string) {
  try {
    return (JSON.parse(localStorage.getItem(SEEN) ?? "[]") as string[]).includes(region);
  } catch {
    return false;
  }
}
function markCalled(region: string) {
  try {
    const list = JSON.parse(localStorage.getItem(SEEN) ?? "[]") as string[];
    localStorage.setItem(SEEN, JSON.stringify([...list, region].slice(-60)));
  } catch {
    /* ignore */
  }
}

/** Two-tone ring, Web Audio (runs after the user's start press, so audio is unlocked). */
function ring(): () => void {
  let stop = false;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const burst = () => {
      if (stop) return;
      const t = ctx.currentTime;
      for (let i = 0; i < 2; i++)
        for (const f of [440, 480]) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = f;
          g.gain.setValueAtTime(0, t + i * 0.45);
          g.gain.linearRampToValueAtTime(0.05, t + i * 0.45 + 0.02);
          g.gain.setValueAtTime(0.05, t + i * 0.45 + 0.35);
          g.gain.linearRampToValueAtTime(0, t + i * 0.45 + 0.4);
          o.connect(g).connect(ctx.destination);
          o.start(t + i * 0.45);
          o.stop(t + i * 0.45 + 0.42);
        }
      setTimeout(burst, 2600);
    };
    burst();
    return () => {
      stop = true;
      setTimeout(() => ctx.close(), 600);
    };
  } catch {
    return () => {};
  }
}

/**
 * "The Goose calls you" (IDEAS §1): the first time you set foot in a region you haven't claimed, an incoming call.
 * Answer and The Goose briefs you on that region's quests (Gemini TTS, or the phone's own voice as a fallback).
 * Also triggerable from the demo panel with `mc:goose-call`.
 */
export default function GooseCall({ enabled }: { enabled: boolean }) {
  const [phase, setPhase] = useState<Phase | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopRing = useRef<(() => void) | null>(null);
  const lastVisits = useRef<Set<string> | null>(null);

  // New region visits → ring (once per region, never for claimed ones).
  useEffect(() => {
    if (!enabled) return;
    lastVisits.current = new Set(Object.keys(getSnapshot().visits));
    const unsubscribe = subscribe(() => {
      const s = getSnapshot();
      const now = Object.keys(s.visits);
      const fresh = now.find((r) => !lastVisits.current?.has(r));
      lastVisits.current = new Set(now);
      if (fresh && !s.districts[fresh] && !calledBefore(fresh)) setPhase((p) => p ?? { region: fresh, stage: "ringing" });
    });
    return () => {
      unsubscribe();
    };
  }, [enabled]);

  useEffect(() => {
    const demo = (e: Event) => setPhase({ region: (e as CustomEvent<string>).detail || "East London", stage: "ringing" });
    window.addEventListener("mc:goose-call", demo);
    return () => window.removeEventListener("mc:goose-call", demo);
  }, []);

  useEffect(() => {
    if (phase?.stage !== "ringing") return;
    stopRing.current = ring();
    const t = setTimeout(() => decline(), 20_000); // missed call
    return () => {
      clearTimeout(t);
      stopRing.current?.();
      stopRing.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase?.stage, phase?.region]);

  function finish() {
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
    duckMusic(false);
    setPhase(null);
  }
  function decline() {
    if (phase) markCalled(phase.region);
    finish();
  }

  async function answer() {
    if (!phase) return;
    markCalled(phase.region);
    setPhase({ ...phase, stage: "talking" });
    duckMusic(true);
    try {
      const res = await fetch(`/api/goose-call?region=${encodeURIComponent(phase.region)}`);
      const call = (await res.json()) as { script: string; audio: { data: string; mime: string } | null };
      setPhase((p) => (p ? { ...p, stage: "talking", script: call.script } : p));
      const done = () => setPhase((p) => (p ? { ...p, stage: "ended" } : p));
      if (call.audio) {
        const a = new Audio(`data:${call.audio.mime};base64,${call.audio.data}`);
        audioRef.current = a;
        a.onended = done;
        await a.play().catch(done);
      } else if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(call.script);
        u.rate = 0.95;
        u.pitch = 0.8;
        u.onend = done;
        window.speechSynthesis.speak(u);
      } else done();
    } catch {
      setPhase((p) => (p ? { ...p, stage: "ended", script: "Line's bad, kid. Check the region board." } : p));
    }
  }

  return (
    <AnimatePresence>
      {phase && (
        <motion.div
          key="goose-call"
          className="absolute inset-x-3 z-[48] overflow-hidden rounded-[28px] bg-[#0c0618]/95 p-5 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl"
          style={{ top: "calc(var(--safe-top) + 10px)" }}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          role="dialog"
          aria-label="Incoming call from The Goose"
        >
          <div className="flex items-center gap-4">
            <motion.div
              className="h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 ring-pink"
              animate={phase.stage === "ringing" ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={{ duration: 1.2, repeat: phase.stage === "ringing" ? Infinity : 0 }}
            >
              <GoosePortrait size={64} />
            </motion.div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold tracking-[0.2em] text-pink uppercase">
                {phase.stage === "ringing" ? "Incoming call" : phase.stage === "talking" ? "On the line" : "Call ended"}
              </p>
              <p className="font-display text-[26px] leading-none text-ink uppercase">The Goose</p>
              <p className="mt-0.5 truncate text-[13px] text-ink/60">re: {phase.region}</p>
            </div>
          </div>
          {phase.script && <p className="mt-3 text-[14px] leading-snug text-ink/85 italic">“{phase.script}”</p>}
          {phase.stage === "talking" && !phase.script && <p className="mt-3 text-[14px] text-ink/60">Connecting…</p>}
          <div className="mt-4 flex gap-3">
            {phase.stage === "ringing" ? (
              <>
                <button type="button" onClick={decline} className="min-h-[48px] flex-1 rounded-full bg-[#ff3b5c] text-[15px] font-bold text-white">
                  Decline
                </button>
                <button type="button" onClick={answer} className="min-h-[48px] flex-1 rounded-full bg-[#2ee6a0] text-[15px] font-bold text-night">
                  Answer
                </button>
              </>
            ) : (
              <button type="button" onClick={finish} className="min-h-[48px] flex-1 rounded-full bg-white/10 text-[15px] font-bold text-ink">
                {phase.stage === "ended" ? "Close" : "Hang up"}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
