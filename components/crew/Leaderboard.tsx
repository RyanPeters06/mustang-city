"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getAccount, getServerAccount, subscribeAccount } from "@/lib/account";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";
import { getSnapshot as getFog } from "@/lib/fog";
import { pctFromCells } from "@/lib/fog";
import { DEMO_FACULTIES, demoCompetition, demoFriends } from "@/lib/demoCrew";
import { DISTRICTS } from "@/lib/districts";
import { facultyColor, facultyShort } from "@/lib/faculty";
import { FLAME_PATH } from "../missions/DailyCard";
import type { BoardRow, FacultyRow } from "@/app/api/leaderboard/route";
import type { EmblemId } from "@/lib/progress";
import Emblem from "../profile/Emblem";

type Period = "week" | "all";
type Scope = "all" | "faculty" | "friends";
type Metric = "regions" | "rep" | "explored";

function Chips<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="flex gap-1 rounded-full bg-white/[0.06] p-1" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`min-h-[44px] flex-1 rounded-full px-2.5 text-[12px] font-bold whitespace-nowrap ${value === v ? "bg-pink text-night" : "text-ink/60"}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export default function Leaderboard() {
  const account = useSyncExternalStore(subscribeAccount, getAccount, getServerAccount);
  const me = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const live = account.auth === "signed-in" && account.sync === "ok";
  const [period, setPeriod] = useState<Period>("week");
  const [scope, setScope] = useState<Scope>("all");
  const [metric, setMetric] = useState<Metric>("regions");
  const [data, setData] = useState<{ rows: BoardRow[]; mine: BoardRow | null; faculties?: FacultyRow[] } | null>(null);

  useEffect(() => {
    if (!live) return;
    let alive = true;
    fetch(`/api/leaderboard?period=${period}&scope=${scope}&metric=${metric}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && setData(j ?? { rows: [], mine: null, faculties: [] }))
      .catch(() => alive && setData({ rows: [], mine: null, faculties: [] }));
    return () => {
      alive = false;
    };
  }, [live, period, scope, metric]);

  // Demo board (signed out / accounts off): the labelled demo crew plus you, ranked locally.
  const demoRows = useMemo<BoardRow[]>(() => {
    const you: BoardRow = {
      rank: 0,
      handle: "you",
      name: me.profile.name || "You",
      faculty: me.profile.faculty || null,
      emblem: me.profile.emblem,
      accent: me.profile.accent,
      rep: me.rep,
      cells: getFog().count,
      regions: me.regionsClaimed,
      streak: me.streak,
      me: true,
    };
    const rows: BoardRow[] = [...demoFriends().map((f) => ({ ...f, ...demoCompetition(f.handle), rank: 0, me: false })), you];
    rows.sort((a, b) => (metric === "regions" ? b.regions - a.regions || b.rep - a.rep : metric === "rep" ? b.rep - a.rep : b.cells - a.cells));
    return rows.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [me, metric]);

  const rows = live ? (data?.rows ?? null) : demoRows;
  const mine = live ? data?.mine : demoRows.find((r) => r.me);

  return (
    <div className="space-y-3 pb-4">
      <Chips label="Period" value={period} onChange={setPeriod} options={[["week", "This week"], ["all", "All time"]]} />
      <div className="space-y-2">
        <Chips label="Who" value={scope} onChange={setScope} options={[["all", "Western"], ["faculty", "Faculty"], ["friends", "Crew"]]} />
        <Chips label="Rank by" value={metric} onChange={setMetric} options={[["regions", "Regions"], ["rep", "Rep"], ["explored", "%"]]} />
      </div>

      {!live && (
        <p className="rounded-2xl bg-white/[0.04] px-3 py-2 text-[12px] text-ink/60">
          Demo board: sample players + you. Sign in (when accounts are on) to rank against all of Western.
        </p>
      )}

      {rows === null ? (
        <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
      ) : rows.length === 0 ? (
        <p className="text-[14px] text-ink/60">
          {scope === "faculty" && !me.profile.faculty ? "Pick your faculty in Profile to see your faculty board." : "No one on this board yet."}
        </p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((r) => (
            <li
              key={`${r.handle}-${r.rank}`}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${r.me ? "bg-pink/12 ring-1 ring-pink/40" : "bg-white/[0.04]"}`}
            >
              <span className={`w-7 text-center text-[16px] font-bold tabular-nums ${r.rank <= 3 ? "text-gold" : "text-ink/60"}`}>{r.rank}</span>
              <Emblem id={r.emblem as EmblemId} accent={r.accent} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-ink">
                  {r.name}
                  {r.me && <span className="ml-1 text-[12px] font-bold text-pink">YOU</span>}
                </span>
                <span className="flex items-center gap-1.5 text-[12px] text-ink/60">
                  <span className="truncate">{r.faculty ?? "—"}</span>
                  {r.streak > 0 && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 font-bold text-orange" aria-label={`${r.streak}-day streak`}>
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden><path d={FLAME_PATH} /></svg>
                      {r.streak}
                    </span>
                  )}
                </span>
              </span>
              <span className="text-right text-[14px] font-bold tabular-nums text-orange">
                {metric === "regions"
                  ? `${r.regions}/${DISTRICTS.length}`
                  : metric === "rep"
                  ? r.rep.toLocaleString()
                  : `${(pctFromCells(r.cells) < 10 ? pctFromCells(r.cells).toFixed(2) : pctFromCells(r.cells).toFixed(1))}%`}
              </span>
            </li>
          ))}
        </ol>
      )}
      {live && mine && mine.rank > 50 && (
        <p className="text-center text-[14px] text-ink/60">You&apos;re #{mine.rank} on this board.</p>
      )}
      {!live && period === "week" && <p className="text-[12px] text-ink/60">Weekly totals need accounts; the demo shows all-time numbers.</p>}
      <FacultyWar rows={live ? (data?.faculties ?? []) : DEMO_FACULTIES} sample={!live} myFaculty={me.profile.faculty} />
    </div>
  );
}

/** Faculty war: regions held per faculty (a region goes to the faculty with the most members who claimed it). */
function FacultyWar({ rows, sample, myFaculty }: { rows: FacultyRow[]; sample: boolean; myFaculty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.regions));
  return (
    <section className="hud-panel mt-2 p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">Faculty war{sample ? " · sample" : ""}</h3>
        <span className="text-[12px] text-ink/55">regions held</span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 text-[14px] text-ink/60">No regions claimed yet. Claim one and your faculty takes the lead.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {rows.map((r, i) => (
            <li key={r.faculty} className="flex items-center gap-3">
              <span className={`w-5 text-center text-[14px] font-bold tabular-nums ${i === 0 ? "text-gold" : "text-ink/55"}`}>{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`truncate text-[14px] font-semibold ${r.faculty === myFaculty ? "text-pink" : "text-ink"}`}>
                    {facultyShort(r.faculty)}
                    {r.faculty === myFaculty && <span className="ml-1 text-[11px] font-bold">YOURS</span>}
                  </span>
                  <span className="text-[14px] font-bold text-ink tabular-nums">{r.regions}</span>
                </span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full" style={{ width: `${(r.regions / max) * 100}%`, background: facultyColor(r.faculty) }} />
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-[12px] text-ink/55">Each region goes to the faculty with the most members who claimed it.</p>
    </section>
  );
}
