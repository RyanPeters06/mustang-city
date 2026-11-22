"use client";

import { useSyncExternalStore } from "react";
import { getServerPlaying, isPlaying, subscribeMusic, toggleMusic } from "@/lib/music";

/** Profile → soundtrack switch for the procedural synthwave bed (lib/music.ts). */
export default function MusicToggle() {
  const on = useSyncExternalStore(subscribeMusic, isPlaying, getServerPlaying);
  return (
    <section className="flex min-h-[56px] items-center justify-between gap-3 rounded-2xl bg-white/[0.04] px-4 py-3">
      <span>
        <span className="block text-[14px] font-semibold text-ink">Soundtrack</span>
        <span className="block text-[12px] text-ink/60">Original synthwave, made in your browser</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggleMusic}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${on ? "bg-pink" : "bg-white/15"}`}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-7" : "left-1"}`} />
        <span className="sr-only">Soundtrack</span>
      </button>
    </section>
  );
}
