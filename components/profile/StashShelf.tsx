"use client";

import type { ProgressSnapshot } from "@/lib/progress";
import { LOOT_REP, stashValue, type LootItem, type Rarity } from "@/lib/loot";

const TONE: Record<Rarity, string> = { common: "text-teal bg-teal/10", rare: "text-purple bg-purple/15", legendary: "text-gold bg-gold/15 ring-1 ring-gold/50" };

function Item({ i }: { i: LootItem }) {
  return (
    <li className={`rounded-xl px-2.5 py-1.5 text-[12px] font-semibold ${TONE[i.rarity]}`} title={`${i.rarity} · +${LOOT_REP[i.rarity]} Rep`}>
      {i.name}
    </li>
  );
}

/** Profile → stash & carry: what's in your bag (not yet counted) and what's banked at Mustang City. */
export default function StashShelf({ snap }: { snap: ProgressSnapshot }) {
  return (
    <section className="rounded-2xl bg-white/[0.04] px-4 py-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">Stash · Mustang City</h3>
        <span className="text-[12px] font-semibold text-gold tabular-nums">+{stashValue(snap.stash)} Rep</span>
      </div>
      {snap.bag.length > 0 && (
        <>
          <p className="mt-2 text-[12px] text-ink/60">
            Carrying {snap.bag.length}/{snap.bagSize}. Walk back onto campus to bank it.
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {snap.bag.map((i) => (
              <Item key={i.id} i={i} />
            ))}
          </ul>
        </>
      )}
      {snap.stash.length ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {snap.stash.map((i) => (
            <Item key={i.id} i={i} />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[13px] text-ink/60">Quests drop loot into your bag. It only counts once you bring it home to Mustang City.</p>
      )}
    </section>
  );
}
