"use client";

import { BADGES } from "@/lib/badges";
import type { ProgressSnapshot } from "@/lib/progress";

/** Profile → Badges: earned ones lit with date; locked ones show progress or what unlocks them. */
export default function BadgeGrid({ snap }: { snap: ProgressSnapshot }) {
  const input = { completions: snap.completions, pct: snap.pct };
  const earnedCount = BADGES.filter((b) => snap.badges[b.code]).length;
  return (
    <section>
      <h3 className="mb-2 text-[12px] font-bold tracking-[0.16em] text-ink/55 uppercase">
        Badges · {earnedCount}/{BADGES.length}
      </h3>
      <ul className="grid grid-cols-3 gap-2.5">
        {BADGES.map((b) => {
          const at = snap.badges[b.code];
          const st = b.evaluate(input);
          return (
            <li key={b.code} className={`flex flex-col items-center rounded-2xl p-2.5 text-center ${at ? "bg-white/[0.07]" : "bg-white/[0.03]"}`}>
              <span
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={at ? { background: b.color, boxShadow: `0 6px 20px -8px ${b.color}` } : { background: "rgba(255,255,255,0.06)" }}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={at ? "#140A2E" : "rgba(246,239,255,0.35)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={b.glyph} />
                </svg>
              </span>
              <span className={`mt-1.5 text-[12px] leading-tight font-bold ${at ? "text-ink" : "text-ink/55"}`}>{b.name}</span>
              <span className="mt-0.5 text-[10px] leading-tight text-ink/45">
                {at
                  ? new Date(at).toLocaleDateString("en-CA", { month: "short", day: "numeric" })
                  : (st.lockedNote ?? `${st.have}/${st.need}${b.code === "cartographer" ? "%" : ""}`)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
