"use client";

import { useEffect, useState } from "react";
import type { ProgressSnapshot } from "@/lib/progress";
import { DAILY_REP, DAILY_SWEEP_REP, dailyQuests, dayKey, msToMidnight } from "@/lib/daily";
import { SURPRISE_REP, todaysSurprises } from "@/lib/surprise";

export const FLAME_PATH = "M12 3c1 3.5 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2 1-3.2 2-4.2.2 1.6 1 2.6 2 2.7C11 8.6 11.3 5.6 12 3Z";

const fmtLeft = (ms: number) => {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/** Missions tab → today's three quests, the streak, and when they reset. */
export default function DailyCard({ snap }: { snap: ProgressSnapshot }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const day = dayKey(now);
  const quests = dailyQuests(day);
  const done = quests.map((q) => !!snap.dailyDone[`${day}|${q.id}`]);
  const count = done.filter(Boolean).length;
  const doneToday = count > 0;

  return (
    <section className="hud-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`grid h-10 w-10 place-items-center rounded-full ${snap.streak > 0 ? "bg-orange/20 text-orange" : "bg-white/[0.07] text-ink/40"}`}
            aria-hidden
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
              <path d={FLAME_PATH} />
            </svg>
          </span>
          <div>
            <p className="text-[18px] leading-tight font-bold text-ink tabular-nums">
              {snap.streak > 0 ? `${snap.streak}-day streak` : "Start a streak"}
            </p>
            <p className="text-[12px] text-ink/60">
              {doneToday ? "Streak safe for today." : snap.streak > 0 ? "Do one daily quest today to keep it." : "Do one daily quest to start."}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-right text-[12px] text-ink/55">
          New quests in
          <span className="block font-semibold text-ink/80 tabular-nums">{fmtLeft(msToMidnight(now))}</span>
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {quests.map((q, i) => {
          const ok = done[i];
          const target = q.id === "explore" ? 70 : q.id === "explore2" ? 175 : 0;
          return (
            <li key={q.id} className="flex items-start gap-3 rounded-2xl bg-white/[0.04] px-3 py-2.5">
              <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${ok ? "bg-teal text-night" : "border border-white/25"}`} aria-hidden>
                {ok && (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[14px] font-semibold ${ok ? "text-ink/60 line-through decoration-teal/60" : "text-ink"}`}>
                  {q.title}
                  {q.stretch && !ok && <span className="ml-1.5 rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-gold uppercase">Stretch</span>}
                </span>
                {!ok && <span className="block text-[12px] text-ink/55">{q.detail}</span>}
                {!ok && target > 0 && (
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full rounded-full bg-teal" style={{ width: `${Math.min(1, snap.cellsToday / target) * 100}%` }} />
                  </span>
                )}
              </span>
              <span className={`shrink-0 text-[13px] font-bold tabular-nums ${ok ? "text-teal" : "text-orange"}`}>+{DAILY_REP}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[12px] text-ink/55">
        {count === 3 ? `All three done: +${DAILY_SWEEP_REP} bonus Rep earned.` : `Finish all three for +${DAILY_SWEEP_REP} bonus Rep.`}
      </p>
      <div className="mt-3 border-t border-white/10 pt-3">
        <p className="text-[12px] font-bold tracking-[0.14em] text-gold uppercase">Surprises today · +{SURPRISE_REP} Rep each</p>
        <ul className="mt-1.5 space-y-1">
          {todaysSurprises(day).map((s) => (
            <li key={s.id} className={`flex items-baseline justify-between gap-3 text-[13px] ${snap.surprises[s.id] ? "text-ink/45 line-through" : "text-ink/80"}`}>
              <span className="min-w-0 truncate">★ {s.name}</span>
              <span className="shrink-0 text-[12px] text-ink/50">{s.region}</span>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-[12px] text-ink/50">Gold stars on the map. Gone at midnight.</p>
      </div>
    </section>
  );
}
