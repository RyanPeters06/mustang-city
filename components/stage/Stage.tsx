"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import MapView, { type MapHandle } from "../map/MapView";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";
import { getSnapshot as getFog, subscribe as subscribeFog, getServerSnapshot as getFogServer } from "@/lib/fog";
import { DISTRICTS } from "@/lib/districts";
import { FLAME_PATH } from "../missions/DailyCard";

type Event = { at: number; text: string };

/**
 * /stage — the big-screen mirror (IDEAS §1). Full-bleed map with a slow cinematic orbit, live stats and an event
 * ticker. It reads the same on-device progress as the app, and updates live when the app (in another tab or
 * window on this machine) clears fog or finishes quests, via storage events in lib/fog.ts + lib/progress.ts.
 */
export default function Stage() {
  const map = useRef<MapHandle | null>(null);
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const fog = useSyncExternalStore(subscribeFog, getFog, getFogServer);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0); // set after mount (no clock reads during prerender)

  useEffect(() => {
    document.documentElement.setAttribute("data-stage", "1");
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      document.documentElement.removeAttribute("data-stage");
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    m.flyToCity();
    const t = setTimeout(() => m.orbit(true), 3000);
    return () => {
      clearTimeout(t);
      m.orbit(false);
    };
  }, [ready]);

  const events: Event[] = [
    ...Object.entries(snap.districts).map(([name, at]) => ({ at, text: `Claimed ${name}` })),
    ...Object.values(snap.checkins).map((c) => ({ at: c.at, text: `Checked in at ${c.place}` })),
    ...Object.values(snap.completions).map((c) => ({ at: c.at, text: `Mission passed: ${c.slug.replace(/-/g, " ")}` })),
    ...Object.entries(snap.visits).map(([name, at]) => ({ at, text: `Entered ${name}` })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 5);

  const ago = (t: number) => {
    if (!now) return "";
    const s = Math.max(0, Math.round((now - t) / 1000));
    return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : `${Math.round(s / 3600)}h ago`;
  };

  return (
    <main className="absolute inset-0 bg-night">
      <MapView
        ref={map}
        onReady={() => setReady(true)}
        onUnavailable={() => {}}
        onMissionTap={() => {}}
        onBuildingTap={() => {}}
        onTagTap={() => {}}
        onDistrictTap={() => {}}
        onCollectibleTap={() => {}}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/80 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/85 to-transparent" />

      <div className="absolute top-[3vh] left-[3vw] max-w-[48vw]">
        <p className="flex items-center gap-3 text-[18px] font-bold tracking-[0.3em] text-[#ff3b5c] uppercase">
          <span className="h-3 w-3 animate-pulse rounded-full bg-[#ff3b5c]" aria-hidden /> Live
        </p>
        <p className="font-display text-[clamp(40px,5.5vw,96px)] leading-[0.85] text-ink uppercase drop-shadow-[0_6px_30px_rgba(0,0,0,0.8)]">Mustang City</p>
        <p className="mt-1 text-[clamp(12px,1.2vw,22px)] font-semibold tracking-[0.2em] text-gold uppercase">Forest State · {snap.profile.name || "Player one"}</p>
      </div>

      <div className="absolute top-[3vh] right-[3vw] grid grid-cols-2 gap-x-[3vw] gap-y-[2vh] text-right">
        <Stat label="Regions" value={`${snap.regionsClaimed}/${DISTRICTS.length}`} color="text-teal" />
        <Stat label="Rep" value={snap.rep.toLocaleString()} color="text-gold" />
        <Stat label="Blocks explored" value={Math.round(fog.count / 7).toLocaleString()} color="text-pink" />
        <div>
          <p className="flex items-center justify-end gap-2 text-[clamp(26px,2.6vw,48px)] leading-none font-bold text-orange tabular-nums">
            <svg viewBox="0 0 24 24" className="h-[clamp(22px,2.2vw,40px)] w-[clamp(22px,2.2vw,40px)]" fill="currentColor" aria-hidden>
              <path d={FLAME_PATH} />
            </svg>
            {snap.streak}
          </p>
          <p className="mt-1 text-[clamp(10px,0.9vw,15px)] font-semibold tracking-[0.2em] text-ink/60 uppercase">Day streak</p>
        </div>
      </div>

      <div className="absolute right-[3vw] bottom-[4vh] left-[3vw] flex items-end justify-between gap-[3vw]">
        <ol className="space-y-1.5">
          {events.length === 0 ? (
            <li className="text-[clamp(14px,1.3vw,24px)] text-ink/70">Waiting for the first move…</li>
          ) : (
            events.map((e, i) => (
              <li key={`${e.at}-${i}`} className={`text-[clamp(14px,1.3vw,24px)] ${i === 0 ? "font-bold text-ink" : "text-ink/60"}`}>
                <span className="mr-3 text-[16px] text-ink/45 tabular-nums">{ago(e.at)}</span>
                {e.text}
              </li>
            ))
          )}
        </ol>
        <p className="shrink-0 text-right text-[clamp(12px,1.1vw,20px)] font-semibold text-ink/70">
          Play at <span className="text-gold">mustangcity.rodeo</span>
        </p>
      </div>
    </main>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className={`text-[clamp(26px,2.6vw,48px)] leading-none font-bold tabular-nums ${color}`}>{value}</p>
      <p className="mt-1 text-[clamp(10px,0.9vw,15px)] font-semibold tracking-[0.2em] text-ink/60 uppercase">{label}</p>
    </div>
  );
}
