"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getAccount, getServerAccount, subscribeAccount } from "@/lib/account";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";
import { getSnapshot as getFog } from "@/lib/fog";
import { pctFromCells } from "@/lib/fog";
import { demoFriends } from "@/lib/demoCrew";
import type { BoardRow } from "@/app/api/leaderboard/route";
import type { EmblemId } from "@/lib/progress";
import Emblem from "../profile/Emblem";

type Period = "week" | "all";
type Scope = "all" | "faculty" | "friends";
type Metric = "rep" | "explored";

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
  const [metric, setMetric] = useState<Metric>("rep");
  const [data, setData] = useState<{ rows: BoardRow[]; mine: BoardRow | null } | null>(null);

  useEffect(() => {
    if (!live) return;
    let alive = true;
    fetch(`/api/leaderboard?period=${period}&scope=${scope}&metric=${metric}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && setData(j ?? { rows: [], mine: null }))
      .catch(() => alive && setData({ rows: [], mine: null }));
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
      me: true,
    };
    const rows = [...demoFriends().map((f) => ({ ...f, rank: 0, me: false })), you];
    rows.sort((a, b) => (metric === "rep" ? b.rep - a.rep : b.cells - a.cells));
    return rows.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [me, metric]);

  const rows = live ? (data?.rows ?? null) : demoRows;
  const mine = live ? data?.mine : demoRows.find((r) => r.me);

  return (
    <div className="space-y-3 pb-4">
      <Chips label="Period" value={period} onChange={setPeriod} options={[["week", "This week"], ["all", "All time"]]} />
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Chips label="Who" value={scope} onChange={setScope} options={[["all", "Western"], ["faculty", "Faculty"], ["friends", "Crew"]]} />
        <Chips label="Rank by" value={metric} onChange={setMetric} options={[["rep", "Rep"], ["explored", "%"]]} />
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
                <span className="block truncate text-[12px] text-ink/60">{r.faculty ?? "—"}</span>
              </span>
              <span className="text-right text-[14px] font-bold tabular-nums text-orange">
                {metric === "rep"
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
    </div>
  );
}
