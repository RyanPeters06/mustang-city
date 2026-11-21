"use client";

import { useSyncExternalStore } from "react";
import { getRadio, getServerRadio, radioOff, radioOn, subscribeRadio } from "@/lib/radio";
import { STATION } from "@/lib/radioFacts";

/** Forest FM: round control in the right-hand stack; captions in a card bottom-left while a segment plays. */
export default function RadioPill() {
  const r = useSyncExternalStore(subscribeRadio, getRadio, getServerRadio);
  const live = r.status === "playing";

  return (
    <>
      <button
        type="button"
        onClick={() => (r.on ? radioOff() : radioOn())}
        aria-pressed={r.on}
        aria-label={r.on ? `Turn ${STATION} off` : `Turn on ${STATION}`}
        className={`rise-in glass absolute right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full active:scale-95 ${r.on ? "text-gold" : "text-ink/80"}`}
        style={{ animationDelay: "160ms",  bottom: "calc(var(--safe-bottom) + 288px)" }}
      >
        <span className="flex h-4 items-end gap-[2.5px]" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`block w-[3px] rounded-full bg-current ${live ? "animate-[eq_0.9s_ease-in-out_infinite]" : ""}`}
              style={{ height: `${[7, 12, 9, 5][i]}px`, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
      </button>
      {r.on && r.script && (r.status === "playing" || r.status === "tuning") && (
        <div
          key={r.script}
          className="glass absolute left-4 z-20 max-w-[calc(100%-96px)] animate-[fadein_300ms_ease-out] rounded-[18px] px-3.5 py-2.5"
          style={{ bottom: "calc(var(--safe-bottom) + 168px)" }}
          aria-live="polite"
        >
          <p className="text-[11px] font-semibold text-gold">
            {STATION}
            {r.scriptDistrict && <span className="text-ink/55"> · {r.scriptDistrict}</span>}
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-ink/85">{r.script}</p>
        </div>
      )}
    </>
  );
}
