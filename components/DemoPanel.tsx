"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DEMO_WALK, densify } from "@/lib/geo";
import { resetFog, revealAround } from "@/lib/fog";
import { acceptFix } from "@/lib/location";
import { missionBySlug } from "@/lib/missions";
import { resetProgress } from "@/lib/progress";
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
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "d" || e.key === "D") setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearInterval(timer.current);
    };
  }, []);

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

  const btn = "w-full rounded-lg bg-white/10 px-3 py-2 text-left text-[13px] font-semibold text-white hover:bg-white/20";

  return createPortal(
    <div className="fixed top-4 left-4 z-[100] w-56 space-y-1.5 rounded-xl border border-white/10 bg-black/85 p-3 font-sans shadow-2xl">
      <p className="pb-1 text-[11px] font-bold tracking-[0.2em] text-pink uppercase">Demo controls</p>
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
        onClick={() => onPassed({ slug: selected ?? "goose-sighting", rep: 100, reason: "Demo replay of the pass moment." })}
      >
        Play MISSION PASSED
      </button>
      <button className={btn} onClick={() => { stopWalk(); resetFog(); }}>Reset fog</button>
      <button className={btn} onClick={resetProgress}>Reset missions</button>
      <p className="pt-1 text-[11px] text-white/50">Press D to hide</p>
    </div>,
    document.body,
  );
}
