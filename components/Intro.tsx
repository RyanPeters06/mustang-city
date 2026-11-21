"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Emblem, Wordmark } from "./brand/Logo";
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
      {/* Loader + title card */}
      <AnimatePresence>
        {(phase === "loader" || phase === "title") && (
          <motion.div
            key="loader"
            className="absolute inset-0 z-[45] flex flex-col items-center justify-center overflow-hidden"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{
              backdropFilter: phase === "title" ? "blur(10px)" : undefined,
              WebkitBackdropFilter: phase === "title" ? "blur(10px)" : undefined,
              background:
                phase === "title"
                  ? "radial-gradient(120% 60% at 50% 115%, rgba(255,138,61,0.9) 0%, rgba(255,79,139,0.75) 30%, rgba(123,47,247,0.55) 58%, rgba(10,5,24,0.75) 85%)"
                  : "radial-gradient(120% 60% at 50% 110%, #ff8a3d 0%, #ff4f8b 30%, #7b2ff7 58%, #140a2e 85%)",
            }}
          >
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: "linear-gradient(180deg, transparent, #000 85%)" }} />
            <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }} className="relative flex flex-col items-center">
              <Emblem size={112} />
              <Wordmark className="mt-3" />
            </motion.div>

            {mapState === "unavailable" ? (
              <div className="glass relative mx-8 mt-10 px-5 py-4 text-center">
                <p className="text-[15px] font-semibold text-ink">Map unavailable</p>
                <p className="mt-1 text-[13px] text-ink/70">{REASONS[reason ?? ""] ?? "Something went wrong loading the map."}</p>
              </div>
            ) : phase === "title" ? (
              <motion.button
                type="button"
                onClick={enter}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative mt-10 min-h-[52px] bg-ink px-8 text-[15px] font-bold tracking-[0.3em] text-night uppercase shadow-[0_10px_40px_-6px_rgba(255,79,139,0.9)]"
                style={{ clipPath: "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)" }}
              >
                Tap to enter
              </motion.button>
            ) : (
              <div className="relative mt-10 h-1 w-44 overflow-hidden bg-white/15">
                <motion.div
                  className="h-full w-1/3 bg-gradient-to-r from-gold via-pink to-purple"
                  animate={{ x: ["-100%", "300%"] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                />
              </div>
            )}

            {mapState !== "unavailable" && (
              <p key={tip} className="relative mt-6 h-10 max-w-[260px] animate-[fadein_400ms_ease-out] text-center text-[13px] leading-snug text-ink/75">
                {TIPS[tip]}
              </p>
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
                  <p className="text-[12px] font-bold tracking-[0.4em] text-teal uppercase">{cap.kicker}</p>
                  <p className="font-display mt-1 text-[52px] leading-none text-ink uppercase drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">{cap.title}</p>
                  <div className="sunset-rule mt-2 w-40" />
                </motion.div>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => map.current?.skipIntro()}
              className="absolute right-4 bottom-[3%] min-h-[44px] px-3 text-[12px] font-bold tracking-[0.2em] text-ink/70 uppercase"
            >
              Skip ›
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
