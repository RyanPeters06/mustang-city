"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Emblem } from "./brand/Logo";
import type { MapHandle, IntroStep } from "./map/MapView";
import type { CoverArt } from "@/lib/brandAssets";
import { EASE_OUT } from "@/lib/motion";

type Props = {
  map: React.RefObject<MapHandle | null>;
  mapState: "loading" | "ready" | "unavailable";
  reason?: string;
  onDone: () => void;
  cover?: CoverArt;
};

const REASONS: Record<string, string> = {
  "missing-token": "Map token isn't configured for this deployment.",
  "bad-token": "The map token was rejected.",
  webgl: "This device can't draw the 3D map.",
};

const TIPS = [
  "Walk anywhere in London to clear the fog.",
  "Tap a neighbourhood to see how much of it you own.",
  "Missions from The Goose pay Rep. Rep raises your rank.",
  "Your location is never shared live. Only cleared fog.",
  "Leave tags for whoever clears the fog after you.",
];

const CAPTIONS: Record<Exclude<IntroStep, "done">, { kicker: string; title: string }> = {
  forest: { kicker: "Welcome to", title: "Forest State" },
  mustang: { kicker: "Western campus", title: "Mustang City" },
};

const SEEN_KEY = "mc.intro.seen";
const noopSubscribe = () => () => {};
/** Phones say "Tap", laptops say "Click". */
const isCoarsePointer = () => window.matchMedia("(pointer: coarse)").matches;
const seenThisSession = () => {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Entrance: branded loader → "tap to enter" title card → letterboxed camera flight from the whole
 * of Forest State down into Mustang City, with establishing-shot captions. Once per session;
 * later loads just fade the loader. The tap also gives us the user gesture audio needs later.
 */
export default function Intro({ map, mapState, reason, onDone, cover = null }: Props) {
  const seen = useSyncExternalStore(noopSubscribe, seenThisSession, () => false);
  const [chosen, setPhase] = useState<"title" | "diving" | "flying" | "done" | null>(null);
  const collage = cover?.kind === "collage";
  const coarse = useSyncExternalStore(noopSubscribe, isCoarsePointer, () => true);
  const reduceMotion = useReducedMotion();
  const phase = mapState !== "ready" ? "loader" : (chosen ?? (seen ? "done" : "title"));
  const [caption, setCaption] = useState<IntroStep | null>(null);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    if (phase !== "loader" && phase !== "title") return;
    const t = setInterval(() => setTip((i) => (i + 1) % TIPS.length), 2600);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === "title") map.current?.prepareIntro();
    if (phase === "done") onDone();
  }, [phase, map, onDone]);

  // Replay from the demo panel.
  useEffect(() => {
    const replay = () => setPhase("title");
    window.addEventListener("mc:replay-intro", replay);
    return () => window.removeEventListener("mc:replay-intro", replay);
  }, [map]);

  async function enter() {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* private mode: the intro just plays again next time */
    }
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (collage && !reduced) {
      // Dive into the cover's Mustang City logo, then hand over to the map flight.
      setPhase("diving");
      await new Promise((r) => setTimeout(r, COVER_DIVE_MS));
    }
    setPhase("flying");
    await map.current?.playIntro(setCaption);
    setCaption(null);
    setPhase("done");
    onDone();
  }

  const cap = caption && caption !== "done" ? CAPTIONS[caption] : null;

  return (
    <>
      {/* Loader + title card: genre-style loading art (our own 3D campus at dusk), slowly panning and cross-fading */}
      <AnimatePresence>
        {(phase === "loader" || phase === "title" || phase === "diving") && (
          <motion.div
            key="loader"
            className={`absolute inset-0 z-[45] overflow-hidden ${collage ? "bg-black" : "bg-[#0c0618]"}`}
            initial={{ opacity: 1 }}
            exit={collage ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
            transition={{ duration: collage ? 0.3 : 0.8, ease: EASE_OUT }}
          >
            {cover ? <CoverArtLayer cover={cover} dive={phase === "diving"} /> : <Postcards />}
            {/* legibility: the collage carries its own logo, so it only needs a light bottom fade behind the button */}
            {collage ? (
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-t from-black/85 to-transparent" />
            ) : (
              <>
                <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0c0618]/70 to-transparent" />
                <div aria-hidden className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-[#0c0618] via-[#0c0618]/85 to-transparent" />
              </>
            )}

            <motion.div
              className="absolute inset-x-6 flex flex-col"
              style={{ bottom: "calc(var(--safe-bottom) + 34px)" }}
              animate={{ opacity: phase === "diving" ? 0 : 1 }}
              transition={{ duration: 0.25 }}
            >
              <motion.div
                className={collage ? "sr-only" : undefined}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.9, ease: EASE_OUT }}
              >
                <div className="flex items-end gap-3">
                  <Emblem size={64} />
                  <div className="pb-1">
                    <p className="mb-1.5 text-[12px] font-semibold tracking-[0.3em] text-teal uppercase">Forest State</p>
                    <p
                      className="font-display text-[54px] leading-[0.86] uppercase"
                      style={{
                        background: "linear-gradient(180deg, #ffe3a3 0%, #ffb35c 35%, #ff7a59 62%, #ff4f8b 100%)",
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        color: "transparent",
                      }}
                    >
                      Mustang City
                    </p>
                  </div>
                </div>
              </motion.div>

              {mapState === "unavailable" ? (
                <div className="glass mt-6 rounded-[20px] px-5 py-4">
                  <p className="text-[16px] font-semibold text-ink">Map unavailable</p>
                  <p className="mt-1 text-[14px] text-ink/70">{REASONS[reason ?? ""] ?? "Something went wrong loading the map."}</p>
                </div>
              ) : phase === "title" ? (
                // Label only: the whole screen is the start button (below), arcade-style.
                <motion.p
                  aria-hidden
                  className="mt-7 flex min-h-[56px] items-center justify-center text-center text-[18px] tracking-[0.03em] whitespace-nowrap text-white uppercase"
                  style={{
                    fontFamily: "var(--font-bowlby), var(--font-anton), sans-serif",
                    WebkitTextStroke: "7px #000",
                    paintOrder: "stroke fill",
                    textShadow: "0 4px 0 #000",
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={reduceMotion ? { opacity: 1, y: 0 } : { opacity: [0, 1, 1, 0.35, 1], y: 0 }}
                  transition={reduceMotion ? { duration: 0.4 } : { opacity: { duration: 2.2, times: [0, 0.15, 0.55, 0.78, 1], repeat: Infinity, repeatDelay: 0.2 }, y: { duration: 0.5, ease: EASE_OUT } }}
                >
                  {coarse ? "Tap" : "Click"} anywhere to start
                </motion.p>
              ) : (
                <div className="mt-7 flex min-h-[56px] items-center justify-between gap-4">
                  <p key={tip} className="max-w-[78%] animate-[fadein_400ms_ease-out] text-[14px] leading-snug text-ink/75">
                    {TIPS[tip]}
                  </p>
                  <span className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-white/15 border-t-gold" aria-label="Loading" />
                </div>
              )}
              {phase === "title" && (
                <p key={tip} className="mt-3 h-9 animate-[fadein_400ms_ease-out] text-center text-[12px] leading-snug text-ink/60">
                  {TIPS[tip]}
                </p>
              )}
            </motion.div>
            {phase === "title" && mapState !== "unavailable" && (
              <button
                type="button"
                onClick={enter}
                autoFocus
                aria-label={`${coarse ? "Tap" : "Click"} anywhere to start`}
                className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-none"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Letterbox + establishing captions during the flight */}
      <AnimatePresence>
        {phase === "flying" && (
          <motion.div key="bars" className="pointer-events-auto absolute inset-0 z-[45]" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <motion.div className="absolute inset-x-0 top-0 h-[12%] bg-black" initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }} transition={{ duration: 0.6 }} />
            <motion.div className="absolute inset-x-0 bottom-0 h-[12%] bg-black" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.6 }} />
            <AnimatePresence mode="wait">
              {cap && (
                <motion.div
                  key={caption}
                  className="absolute left-6 bottom-[15%]"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="text-[12px] font-bold tracking-[0.3em] text-teal uppercase">{cap.kicker}</p>
                  <p className="font-display mt-1 text-[52px] leading-none text-ink uppercase drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">{cap.title}</p>
                  <div className="sunset-rule mt-2 w-40" />
                </motion.div>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => map.current?.skipIntro()}
              className="absolute right-4 bottom-[3%] min-h-[44px] min-w-[64px] px-3 text-[12px] font-bold tracking-[0.14em] text-ink/70 rounded-full"
            >
              Skip ›
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const CARDS = [
  { src: "/loading/middlesex.webp", place: "Middlesex College", area: "Mustang City" },
  { src: "/loading/university-college.webp", place: "University College", area: "Mustang City" },
  { src: "/loading/campus.webp", place: "Western campus at dusk", area: "Forest State" },
];

/** Loading art: one postcard at a time, slow push-in, cross-fade every 5 s (static for reduced motion). */
function Postcards() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % CARDS.length), 5200);
    return () => clearInterval(t);
  }, []);
  const c = CARDS[i];
  return (
    <div className="absolute inset-0" aria-hidden>
      <AnimatePresence>
        <motion.div
          key={c.src}
          className="absolute inset-0 bg-cover bg-center motion-reduce:!transform-none"
          style={{ backgroundImage: `url(${c.src})` }}
          initial={{ opacity: 0, scale: 1.12, x: i % 2 ? -12 : 12 }}
          animate={{ opacity: 1, scale: 1.02, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1.2 }, scale: { duration: 7, ease: "linear" }, x: { duration: 7, ease: "linear" } }}
        />
      </AnimatePresence>
      <motion.p
        key={c.place}
        className="absolute left-6 text-[12px] font-medium text-ink/70"
        style={{ top: "calc(var(--safe-top) + 18px)" }}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <span className="text-gold">Visit</span> {c.place} · {c.area}
      </motion.p>
    </div>
  );
}

/** Where the Mustang City logo sits in the portrait collage (scripts/build-cover.mjs: logo centre 540,900 of 1080×1920). */
const LOGO_ORIGIN = "50% 46.9%";
/** Opening close-up: the Goose boss panel (top-left of the collage). */
const OPEN_ORIGIN = "22% 6%";
export const COVER_DIVE_MS = 1150;

/**
 * Ryan's cover art. A collage opens on a close-up of one panel, pulls back to reveal the whole fragmented cover,
 * and on enter dives into the Mustang City logo. Separate panels cycle like the postcards.
 */
function CoverArtLayer({ cover, dive }: { cover: NonNullable<CoverArt>; dive: boolean }) {
  const srcs = cover.kind === "collage" ? [cover.src] : cover.srcs;
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Hold the pull-back until the collage has downloaded, or it plays out behind a black screen.
  useEffect(() => {
    if (cover.kind !== "collage") return;
    const img = new Image();
    img.onload = img.onerror = () => setLoaded(true);
    img.src = cover.src; // onload also fires for a cached image
  }, [cover]);
  useEffect(() => {
    if (srcs.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % srcs.length), 4200);
    return () => clearInterval(t);
  }, [srcs.length]);

  if (cover.kind === "collage") {
    // Scale 1 is the hand-off point: changing transform-origin there causes no jump.
    const target = dive
      ? { scale: 7, opacity: 0, transformOrigin: LOGO_ORIGIN }
      : !loaded
        ? { scale: 2.1, opacity: 0, transformOrigin: OPEN_ORIGIN }
        : revealed
        ? { scale: 1, opacity: 1, transformOrigin: LOGO_ORIGIN }
        : { scale: 1, opacity: 1, transformOrigin: OPEN_ORIGIN };
    return (
      <div className="absolute inset-0 bg-black" aria-hidden>
        <motion.div
          className="absolute inset-0 bg-cover bg-center motion-reduce:!transform-none"
          style={{ backgroundImage: `url(${cover.src})` }}
          initial={{ scale: 2.1, opacity: 0, transformOrigin: OPEN_ORIGIN }}
          animate={target}
          onAnimationComplete={() => loaded && !dive && setRevealed(true)}
          transition={
            dive
              ? { scale: { duration: COVER_DIVE_MS / 1000, ease: [0.7, 0, 0.84, 0] }, opacity: { duration: 0.35, delay: (COVER_DIVE_MS - 350) / 1000 } }
              : { scale: { duration: 3.4, ease: [0.16, 1, 0.3, 1], delay: 0.5 }, opacity: { duration: 0.6 } }
          }
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0" aria-hidden>
      <AnimatePresence>
        <motion.div
          key={srcs[i]}
          className="absolute inset-0 bg-cover bg-center motion-reduce:!transform-none"
          style={{ backgroundImage: `url(${srcs[i]})` }}
          initial={{ opacity: 0, scale: 1.14, rotate: i % 2 ? -1.5 : 1.5 }}
          animate={{ opacity: 1, scale: 1.0, rotate: 0 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 0.9 }, scale: { duration: 6, ease: "linear" }, rotate: { duration: 6 } }}
        />
      </AnimatePresence>
    </div>
  );
}
