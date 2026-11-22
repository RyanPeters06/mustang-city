"use client";

import { useEffect, useRef } from "react";
import type { ProgressSnapshot } from "@/lib/progress";
import { celebrate } from "@/lib/celebrate";

/**
 * O-Week mode (IDEAS §1): a five-step starter chain for first-years (and anyone new, including judges holding the
 * phone cold). Each step uses a real game action; the card disappears once all five are done.
 */
const STEPS: { title: string; done: (s: ProgressSnapshot) => boolean }[] = [
  { title: "Set foot in a region next to campus", done: (s) => !!(s.visits["Masonville"] || s.visits["North London"] || s.visits["Medway"]) },
  { title: "Check in somewhere local", done: (s) => Object.keys(s.checkins).length > 0 },
  { title: "Finish a Goose job", done: (s) => s.missionCount > 0 },
  { title: "Find a gold surprise", done: (s) => Object.keys(s.surprises).length > 0 },
  { title: "Claim your first region", done: (s) => s.regionsClaimed > 0 },
];

export default function OWeekCard({ snap }: { snap: ProgressSnapshot }) {
  const done = STEPS.map((st) => st.done(snap));
  const count = done.filter(Boolean).length;
  const celebrated = useRef(false);

  useEffect(() => {
    if (count < STEPS.length || celebrated.current) return;
    celebrated.current = true;
    try {
      if (localStorage.getItem("mc.oweek.done")) return;
      localStorage.setItem("mc.oweek.done", "1");
    } catch {
      /* ignore */
    }
    celebrate({ id: "oweek-done", kind: "badge", title: "O-Week complete", subtitle: "You know your way around Forest State now.", color: "#2EE6D6", glyph: "M5 12.5l4.5 4.5L19 7.5" });
  }, [count]);

  if (count === STEPS.length) return null;
  const next = done.indexOf(false);

  return (
    <section className="hud-panel p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[12px] font-bold tracking-[0.14em] text-teal uppercase">O-Week: your first five</h3>
        <span className="text-[12px] font-semibold text-ink/60 tabular-nums">{count}/5</span>
      </div>
      <ol className="mt-2 space-y-1.5">
        {STEPS.map((st, i) => (
          <li key={st.title} className="flex items-center gap-2.5 text-[14px]">
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${done[i] ? "bg-teal text-night" : i === next ? "bg-gold text-night" : "bg-white/10 text-ink/50"}`} aria-hidden>
              {done[i] ? "✓" : i + 1}
            </span>
            <span className={done[i] ? "text-ink/45 line-through" : i === next ? "font-semibold text-ink" : "text-ink/65"}>{st.title}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
