"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Emblem } from "./brand/Logo";
import type { MapHandle, IntroStep } from "./map/MapView";

type Props = {
  map: React.RefObject<MapHandle | null>;
  mapState: "loading" | "ready" | "unavailable";
  reason?: string;
  onDone: () => void;
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
export default function Intro({ map, mapState, reason, onDone }: Props) {
  const seen = useSyncExternalStore(noopSubscribe, seenThisSession, () => false);
  const [chosen, setPhase] = useState<"title" | "flying" | "done" | null>(null);
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
        {(phase === "loader" || phase === "title") && (
          <motion.div
            key="loader"
            className="absolute inset-0 z-[45] overflow-hidden bg-[#0c0618]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <Postcards />
            {/* legibility: soft top + strong bottom gradient */}
            <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0c0618]/70 to-transparent" />
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-[#0c0618] via-[#0c0618]/85 to-transparent" />

            <div className="absolute inset-x-6 flex flex-col" style={{ bottom: "calc(var(--safe-bottom) + 34px)" }}>
              <motion.div initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
                <div className="flex items-end gap-3">
                  <Emblem size={64} />
                  <div className="pb-1">
                    <p className="text-[11px] font-semibold tracking-[0.32em] text-teal uppercase">Forest State</p>
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
                  <p className="text-[15px] font-semibold text-ink">Map unavailable</p>
                  <p className="mt-1 text-[13px] text-ink/70">{REASONS[reason ?? ""] ?? "Something went wrong loading the map."}</p>
                </div>
              ) : phase === "title" ? (
                <motion.button
                  type="button"
                  onClick={enter}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="btn-sunset mt-7 flex min-h-[56px] w-full items-center justify-center rounded-full text-[16px] font-bold"
                >
                  Tap to enter
                </motion.button>
              ) : (
                <div className="mt-7 flex min-h-[56px] items-center justify-between gap-4">
                  <p key={tip} className="max-w-[78%] animate-[fadein_400ms_ease-out] text-[13px] leading-snug text-ink/75">
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
            </div>
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
                  <p className="text-[12px] font-bold tracking-[0.4em] text-teal uppercase">{cap.kicker}</p>
                  <p className="font-display mt-1 text-[52px] leading-none text-ink uppercase drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">{cap.title}</p>
                  <div className="sunset-rule mt-2 w-40" />
                </motion.div>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => map.current?.skipIntro()}
              className="absolute right-4 bottom-[3%] min-h-[44px] px-3 text-[12px] font-bold tracking-[0.2em] text-ink/70 rounded-full"
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
