"use client";

import type { ProgressSnapshot } from "@/lib/progress";
import { CATEGORY_LABEL, MISSIONS, type MissionCategory } from "@/lib/missions";
import { SIDE_REP } from "@/lib/sideQuests";

/**
 * Collection sets (IDEAS §2): landmark missions grouped by theme, plus the region side-quest kinds.
 * Completing a set lights it gold on the profile shelf.
 */
export default function CollectionSets({ snap }: { snap: ProgressSnapshot }) {
  const cats = Object.keys(CATEGORY_LABEL) as MissionCategory[];
  const sets = cats
    .map((c) => {
      const list = MISSIONS.filter((m) => m.category === c);
      return { name: `${CATEGORY_LABEL[c]} landmarks`, done: list.filter((m) => snap.completions[m.slug]).length, total: list.length };
    })
    .filter((s) => s.total > 0);
  const sideDone = Object.keys(snap.sideDone).length;
  sets.push({ name: "Side quests", done: Math.min(sideDone, 10), total: 10 });
  sets.push({ name: "Surprises found", done: Math.min(Object.keys(snap.surprises).length, 7), total: 7 });

  return (
    <section>
      <h3 className="mb-2 text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">Collection sets</h3>
      <ul className="grid grid-cols-2 gap-2">
        {sets.map((s) => {
          const full = s.done >= s.total;
          return (
            <li key={s.name} className={`rounded-2xl px-3 py-2.5 ${full ? "bg-gold/15 ring-1 ring-gold/50" : "bg-white/[0.04]"}`}>
              <p className={`truncate text-[13px] font-semibold ${full ? "text-gold" : "text-ink"}`}>{s.name}</p>
              <p className="text-[12px] text-ink/60 tabular-nums">
                {s.done}/{s.total}
                {full ? " · complete" : ""}
              </p>
              <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/10">
                <span className={`block h-full rounded-full ${full ? "bg-gold" : "bg-teal"}`} style={{ width: `${(s.done / s.total) * 100}%` }} />
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 text-[12px] text-ink/50">Side quests pay +{SIDE_REP} Rep each; sets show how far you are through each theme.</p>
    </section>
  );
}
