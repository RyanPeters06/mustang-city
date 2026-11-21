"use client";

import { useSyncExternalStore } from "react";
import { getRadio, getServerRadio, radioOff, radioOn, subscribeRadio } from "@/lib/radio";
import { STATION } from "@/lib/radioFacts";

/** Map control: Forest FM on/off + live captions while a segment plays. */
export default function RadioPill() {
  const r = useSyncExternalStore(subscribeRadio, getRadio, getServerRadio);
  const live = r.status === "playing";

  return (
    <div
      className="pointer-events-none absolute left-4 z-20 flex max-w-[calc(100%-96px)] flex-col-reverse items-start gap-2"
      style={{ bottom: "calc(var(--safe-bottom) + 168px)" }}
    >
      <button
        type="button"
        onClick={() => (r.on ? radioOff() : radioOn())}
        aria-pressed={r.on}
        aria-label={r.on ? `Turn ${STATION} off` : `Turn on ${STATION}`}
        className={`glass pointer-events-auto flex min-h-[40px] items-center gap-2 px-3 text-[11px] font-bold tracking-[0.18em] uppercase ${r.on ? "text-gold" : "text-ink/70"}`}
        style={{ clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)" }}
      >
        <span className="flex h-3.5 items-end gap-[2px]" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`block w-[3px] bg-current ${live ? "animate-[eq_0.9s_ease-in-out_infinite]" : ""}`}
              style={{ height: `${[6, 10, 8, 4][i]}px`, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
        {STATION}
        <span className="text-ink/50">{r.status === "tuning" ? "· tuning" : r.on ? "· on" : "· off"}</span>
      </button>
      {r.on && r.script && (r.status === "playing" || r.status === "tuning") && (
        <p
          key={r.script}
          className="glass max-w-[270px] animate-[fadein_300ms_ease-out] px-3 py-2 text-[12px] leading-snug text-ink/85"
          aria-live="polite"
        >
          {r.scriptDistrict && <span className="mr-1 font-bold text-teal uppercase">{r.scriptDistrict}:</span>}
          {r.script}
        </p>
      )}
    </div>
  );
}
