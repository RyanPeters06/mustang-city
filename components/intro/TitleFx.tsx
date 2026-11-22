"use client";
/**
 * Title-screen pieces for the cover intro: game-style lettering, the loading / press-start prompts,
 * film grain + vignette, the logo glint, the dive flash and the start sound.
 */
import { motion, useReducedMotion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

/** Chunky stroked lettering (Bowlby One, an original free font; not the GTA typeface). */
export const GAME_TEXT: CSSProperties = {
  fontFamily: "var(--font-bowlby), var(--font-anton), sans-serif",
  WebkitTextStroke: "7px #000",
  paintOrder: "stroke fill",
  textShadow: "0 4px 0 #000",
};

export function GameText({ children, size = 18, className = "" }: { children: ReactNode; size?: number; className?: string }) {
  return (
    <span className={`tracking-[0.03em] whitespace-nowrap text-white uppercase ${className}`} style={{ ...GAME_TEXT, fontSize: size }}>
      {children}
    </span>
  );
}

/** "LOADING..." with stepping dots and an indeterminate sunset bar, while the map streams in. */
export function LoadingPrompt() {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col items-center gap-3" role="status" aria-label="Loading">
      <GameText size={16}>
        Loading
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            aria-hidden
            animate={reduce ? undefined : { opacity: [0.15, 1, 0.15] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          >
            .
          </motion.span>
        ))}
      </GameText>
      <div className="h-[5px] w-40 overflow-hidden rounded-full border border-black bg-black/60">
        <motion.div
          className="h-full w-1/3 rounded-full bg-gradient-to-r from-pink via-orange to-gold"
          animate={reduce ? { x: "100%" } : { x: ["-100%", "300%"] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

/** The press-start line: slow arcade pulse while waiting, a fast confirm blink once pressed. */
export function StartPrompt({ label, pressed }: { label: string; pressed: boolean }) {
  const reduce = useReducedMotion();
  const animate = pressed
    ? { opacity: [1, 0, 1, 0, 1], scale: 1.06 }
    : reduce
      ? { opacity: 1, y: 0 }
      : { opacity: [0, 1, 1, 0.35, 1], y: 0 };
  const transition = pressed
    ? { duration: 0.32, ease: "linear" as const }
    : reduce
      ? { duration: 0.4 }
      : { opacity: { duration: 2.2, times: [0, 0.15, 0.55, 0.78, 1], repeat: Infinity, repeatDelay: 0.2 }, y: { duration: 0.5 } };
  return (
    <motion.p aria-hidden className="flex min-h-[56px] items-center justify-center text-center" initial={{ opacity: 0, y: 10 }} animate={animate} transition={transition}>
      <GameText size={18}>{label}</GameText>
    </motion.p>
  );
}

// Fine film grain, inline so it costs no request.
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/** Print grain + soft vignette over the cover, so it reads like a poster rather than a flat image. */
export function PosterTexture() {
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.09] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 85% at 50% 48%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
    </>
  );
}

/**
 * A light sweep across the logo, masked to the logo's own shape (public/cover/logo.png, written by
 * scripts/build-cover.mjs). Box is in cover-height units: the cover fills the screen's height, so these line up.
 */
export function LogoGlint({ box }: { box: { cx: number; cy: number; h: number; aspect: number } }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  const mask = "url(/cover/logo.png) center / contain no-repeat";
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        top: `${(box.cy - box.h / 2) * 100}%`,
        height: `${box.h * 100}%`,
        aspectRatio: box.aspect,
        left: `${box.cx * 100}%`,
        transform: "translateX(-50%)",
        WebkitMask: mask,
        mask,
        mixBlendMode: "screen",
      }}
    >
      <motion.div
        className="absolute inset-y-[-20%] w-[20%]"
        style={{ background: "linear-gradient(100deg, transparent 0%, rgba(255,240,210,0.45) 50%, transparent 100%)", rotate: 14 }}
        initial={{ left: "-60%" }}
        animate={{ left: ["-60%", "130%"] }}
        transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity, repeatDelay: 4.5, delay: 4.2 }}
      />
    </div>
  );
}

/** White-out at the bottom of the dive, which then fades straight into the map flight. */
export function DiveFlash({ active, durationMs }: { active: boolean; durationMs: number }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-[#fff4e6]"
      initial={{ opacity: 0 }}
      animate={active ? { opacity: [0, 0, 0.95] } : { opacity: 0 }}
      transition={active ? { duration: durationMs / 1000, times: [0, 0.55, 1], ease: "easeIn" } : { duration: 0.2 }}
    />
  );
}

/** Confirm blip + a rising whoosh for the dive. Web Audio, no assets; it runs inside the start tap. */
export function playStartSound(diveMs: number) {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const now = ctx.currentTime;

    // Blip: two quick square notes.
    [880, 1320].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = f;
      const t = now + i * 0.07;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.06, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(g).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    });

    // Whoosh: white noise through a band-pass that sweeps up as the camera dives.
    const dur = (diveMs + 350) / 1000;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.4;
    const start = now + 0.32;
    bp.frequency.setValueAtTime(250, start);
    bp.frequency.exponentialRampToValueAtTime(3200, start + dur - 0.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.16, start + dur * 0.75);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    noise.connect(bp).connect(g).connect(ctx.destination);
    noise.start(start);
    noise.stop(start + dur);
    setTimeout(() => ctx.close(), (dur + 0.6) * 1000);
  } catch {
    /* audio unavailable: the visuals carry it */
  }
}
