"use client";

import { setDemoOn } from "@/lib/demo";
import { addHeat } from "@/lib/wanted";
import { toggleMusic } from "@/lib/music";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DEMO_WALK, densify } from "@/lib/geo";
import { resetFog, revealAround, revealMany } from "@/lib/fog";
import { districtAt, districtSamplePoints } from "@/lib/districts";
import { acceptFix } from "@/lib/location";
import { SAMPLE_TRACE_ID, playTrace } from "@/lib/replay";
import { missionBySlug } from "@/lib/missions";
import { addDemoRep, bankBag, demoLoot, resetProgress } from "@/lib/progress";
import { getLightOverride, setLightOverride, type LightPreset } from "@/lib/mapStyle";
import { isSampleTurf, setSampleTurf } from "@/lib/turf";
import { getHeistSim, setHeistSim } from "@/lib/heistDemo";
import { ageAllCells } from "@/lib/fogAge";
import { forceWeather } from "@/lib/weather";
import type { MapHandle } from "./map/MapView";
import type { PassedInfo } from "./missions/MissionDetail";

/** Hidden judging controls (press D). Lives outside the phone frame on purpose. */
type Props = {
  map: React.RefObject<MapHandle | null>;
  selected: string | null;
  onPassed: (info: PassedInfo) => void;
};

export default function DemoPanel({ map, selected, onPassed }: Props) {
  const [open, setOpen] = useState(false);
  const [walking, setWalking] = useState(false);
  const [light, setLight] = useState<LightPreset | null>(getLightOverride());
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea, [contenteditable]")) return;
      if (e.key === "d" || e.key === "D") setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearInterval(timer.current);
    };
  }, []);

  // Region quests show "Go there" teleports while the demo panel is open.
  useEffect(() => setDemoOn(open), [open]);

  const stopWalk = () => {
    clearInterval(timer.current);
    setWalking(false);
  };

  const walk = () => {
    if (walking) return stopWalk();
    const path = densify(DEMO_WALK, 15);
    let i = 0;
    setWalking(true);
    timer.current = setInterval(() => {
      if (i >= path.length) return stopWalk();
      acceptFix(path[i]); // the map follows the player itself
      i++;
    }, 160);
  };

  if (!open) return null;

  const btn = "w-full rounded-lg bg-white/10 px-3 py-2 text-left text-[14px] font-semibold text-white hover:bg-white/20";

  return createPortal(
    <div className="fixed top-4 left-4 z-[100] max-h-[calc(100dvh-2rem)] w-56 space-y-1.5 overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-black/85 p-3 font-sans shadow-2xl">
      <p className="pb-1 text-[12px] font-bold tracking-[0.14em] text-pink uppercase">Demo controls</p>
      <button className={btn} onClick={walk}>{walking ? "■ Stop walk" : "▶ Walk campus"}</button>
      <button
        className={btn}
        onClick={() => {
          const c = map.current?.center();
          if (c) revealAround(c[1], c[0]);
        }}
      >
        Reveal here
      </button>
      <button className={btn} onClick={() => window.dispatchEvent(new Event("mc:replay-intro"))}>Replay intro</button>
      <button className={btn} onClick={() => map.current?.flyToCampus()}>Fly to Mustang City</button>
      <button className={btn} onClick={() => map.current?.flyToCity()}>Fly to Forest State</button>
      <button
        className={btn}
        disabled={!selected}
        onClick={() => {
          const m = selected ? missionBySlug(selected) : undefined;
          if (!m) return;
          stopWalk();
          // Two fixes: the speed check skips a lone jump, the second confirms the new spot.
          acceptFix(m.lngLat);
          setTimeout(() => acceptFix([m.lngLat[0] + 0.00002, m.lngLat[1]]), 1200);
        }}
      >
        {selected ? "Teleport to this mission" : "Teleport (open a mission)"}
      </button>
      <button
        className={btn}
        onClick={() => {
          stopWalk();
          playTrace(SAMPLE_TRACE_ID, 48);
        }}
      >
        Replay sample walk (48×)
      </button>
      <button
        className={btn}
        onClick={() => onPassed({ slug: selected ?? "goose-sighting", rep: 100, reason: "Demo replay of the pass moment." })}
      >
        Play MISSION PASSED
      </button>
      <button className={btn} onClick={() => onPassed({ slug: selected ?? "goose-sighting", rep: 150, golden: true, reason: "Demo: a golden job roll." })}>
        Play GOLDEN pass (demo)
      </button>
      <button className={btn} onClick={() => { stopWalk(); resetFog(); }}>Reset fog</button>
      <button
        className={btn}
        onClick={() => {
          const c = map.current?.center();
          const name = c ? districtAt(c) : null;
          if (name && c) revealMany(districtSamplePoints(name, 0.33, c));
        }}
      >
        Explore district at centre (demo)
      </button>
      <div className="grid grid-cols-5 gap-1 pt-1">
        {(["auto", "dawn", "day", "dusk", "night"] as const).map((p) => (
          <button
            key={p}
            className={`rounded-md px-1 py-1.5 text-[12px] font-bold uppercase ${light === (p === "auto" ? null : p) ? "bg-pink text-black" : "bg-white/10 text-white"}`}
            onClick={() => {
              const next = p === "auto" ? null : p;
              setLightOverride(next);
              setLight(next);
            }}
          >
            {p}
          </button>
        ))}
      </div>
      <button className={btn} onClick={() => forceWeather("rain")}>Weather: rain (demo)</button>
      <button className={btn} onClick={() => forceWeather("snow")}>Weather: snow (demo)</button>
      <button className={btn} onClick={() => forceWeather(null)}>Weather: live</button>
      <button className={btn} onClick={() => ageAllCells(200)}>Age fog 200 days (decay)</button>
      <button className={btn} onClick={() => ageAllCells(0)}>Refresh fog (no decay)</button>
      <button className={btn} onClick={() => setSampleTurf(!isSampleTurf())}>Sample faculty turf on/off</button>
      <button className={btn} onClick={() => setHeistSim(!getHeistSim())}>Demo heist crew on/off</button>
      <button className={btn} onClick={() => window.dispatchEvent(new CustomEvent("mc:goose-call", { detail: "East London" }))}>The Goose calls (demo)</button>
      <button className={btn} onClick={toggleMusic}>Music on/off</button>
      <button className={btn} onClick={demoLoot}>Loot drop (demo)</button>
      <button className={btn} onClick={() => bankBag()}>Bank bag at Mustang City (demo)</button>
      <button className={btn} onClick={() => addHeat(70)}>Wanted level +1 star (demo)</button>
      <button className={btn} onClick={() => addDemoRep(500)}>+500 Rep (demo)</button>
      <button className={btn} onClick={resetProgress}>Reset missions + demo Rep</button>
      <p className="pt-1 text-[12px] text-white/50">Press D to hide</p>
    </div>,
    document.body,
  );
}
