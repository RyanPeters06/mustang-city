"use client";

import { useState } from "react";
import type { ProgressSnapshot } from "@/lib/progress";
import { completeSideQuest } from "@/lib/progress";
import { SIDE_REP, regionSideQuests, type SideKind, type SideQuest } from "@/lib/sideQuests";
import { distanceM, type LngLat } from "@/lib/geo";
import { radiusScale } from "@/lib/a11y";

const GLYPH: Record<SideKind, string> = {
  photo: "M4 8h3l2-3h6l2 3h3v11H4z M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  bus: "M6 4h12a2 2 0 0 1 2 2v10H4V6a2 2 0 0 1 2-2z M4 11h16 M7 19v-3 M17 19v-3",
  night: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
  trivia: "M9 9a3 3 0 1 1 4 2.8c-.7.3-1 .9-1 1.7V15 M12 18.5v.5",
  crawl: "M7 3v8 M5 3v4a2 2 0 0 0 4 0V3 M7 11v10 M16 3c-1.7 0-3 2-3 5s1.3 4 3 4v9",
  crew: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20a6 6 0 0 1 12 0 M17 11a2.5 2.5 0 1 0 0-5 M21 20a5 5 0 0 0-4-4.9",
  tag: "M5 5h14v10h-7l-4 4v-4H5z M8.5 9.5h7 M8.5 12h4",
  study: "M4 5h7a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4z M20 5h-7a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h7z",
  thrift: "M4 9h16l-1.5 10h-13z M8 9l4-5 4 5 M12 13v3",
  sunset: "M3 18h18 M6 18a6 6 0 0 1 12 0 M12 4v3 M4.2 9.2l2 2 M19.8 9.2l-2 2",
  art: "M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-.9-.6-1.4-.6-2.2 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4c0-4.4-4-8.6-9-8.6z M7.5 11h.01 M10.5 7.5h.01 M15 8h.01",
};
export const SIDE_GLYPH = GLYPH;

const fmtDist = (m: number) => (m < 950 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);
const btn = "min-h-[40px] rounded-full px-4 text-[13px] font-bold";

/** Region card → three light side quests (Rep only; claiming runs on the core quests). */
export default function SideQuests({
  region,
  snap,
  from,
  demo,
  onTeleport,
}: {
  region: string;
  snap: ProgressSnapshot;
  from: LngLat | null;
  demo: boolean;
  onTeleport: (p: LngLat) => void;
}) {
  const quests = regionSideQuests(region);
  const [msg, setMsg] = useState<Record<string, string>>({});
  if (!quests.length) return null;

  const attempt = (q: SideQuest, answer?: number) => {
    const reason = completeSideQuest(region, q.id, from, { demo, answer });
    setMsg((m) => ({ ...m, [q.id]: reason ?? "" }));
  };

  return (
    <section>
      <h3 className="mb-2 text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">Side quests · +{SIDE_REP} Rep each</h3>
      <ul className="space-y-2">
        {quests.map((q) => {
          const done = !!snap.sideDone[q.id];
          const dist = from && q.kind !== "trivia" ? distanceM(from, q.at) : null;
          const near = dist != null && dist <= q.radius * radiusScale();
          return (
            <li key={q.id} className={`hud-panel px-3.5 py-3 ${done ? "opacity-75" : ""}`}>
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${done ? "bg-teal/20 text-teal" : "bg-pink/15 text-pink"}`} aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={done ? "M5 12.5l4.5 4.5L19 7.5" : GLYPH[q.kind]} />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`text-[15px] font-semibold ${done ? "text-ink/70 line-through decoration-teal/60" : "text-ink"}`}>{q.title}</p>
                    {dist != null && !done && <span className="shrink-0 text-[12px] text-ink/50 tabular-nums">{fmtDist(dist)}</span>}
                  </div>
                  {!done && <p className="mt-0.5 text-[13px] leading-snug text-ink/60">{q.detail}</p>}
                  {!done && q.kind === "trivia" && q.trivia && (
                    <div className="mt-2">
                      <p className="text-[13px] font-semibold text-ink/85">{q.trivia.q}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {q.trivia.options.map((o, i) => (
                          <button key={o} type="button" onClick={() => attempt(q, i)} className={`${btn} bg-white/[0.08] text-ink/85`}>
                            {o}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {!done && q.kind !== "trivia" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => attempt(q)} className={`${btn} ${near ? "btn-sunset" : "bg-white/[0.08] text-ink/60"}`}>
                        {near ? (q.kind === "photo" ? "Take the shot" : q.kind === "tag" ? "Drop the tag" : "I'm here") : "Check in"}
                      </button>
                      {demo && (
                        <button type="button" onClick={() => onTeleport(q.at)} className={`${btn} bg-white/[0.08] text-ink/80`}>
                          Go there (demo)
                        </button>
                      )}
                    </div>
                  )}
                  {msg[q.id] && !done && (
                    <p role="status" className="mt-1.5 text-[12px] text-orange">
                      {msg[q.id]}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
