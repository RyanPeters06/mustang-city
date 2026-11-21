"use client";

import { useState, useSyncExternalStore } from "react";
import { getServerTraceSummaries, getTraceSummaries, playTrace, subscribeReplay } from "@/lib/replay";

const SPEEDS = [1, 4, 16];

function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

/** Profile → Replays: every recorded walk (plus the sample), playable at 1×/4×/16×. */
export default function Replays({ onPlay }: { onPlay: () => void }) {
  const list = useSyncExternalStore(subscribeReplay, getTraceSummaries, getServerTraceSummaries);
  const [speed, setSpeed] = useState(16);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">Replays</h3>
        <div className="flex gap-1 rounded-full bg-white/[0.06] p-1" role="radiogroup" aria-label="Replay speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={speed === s}
              onClick={() => setSpeed(s)}
              className={`min-h-[44px] min-w-[40px] rounded-full text-[12px] font-bold ${speed === s ? "bg-pink text-night" : "text-ink/60"}`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
      <ul className="space-y-2">
        {list.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => {
                playTrace(t.id, speed);
                onPlay();
              }}
              className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.04] p-3 text-left active:bg-white/10"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink/15 text-pink" aria-hidden>
                ▶
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-semibold text-ink">{t.label}</span>
                <span className="block text-[12px] text-ink/60">
                  {fmtDuration(t.durationMs)} · {t.distanceM < 1000 ? `${Math.round(t.distanceM)} m` : `${(t.distanceM / 1000).toFixed(1)} km`}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {list.length === 1 && (
        <p className="mt-2 text-[12px] text-ink/60">Your walks are recorded automatically while location is on.</p>
      )}
    </section>
  );
}
