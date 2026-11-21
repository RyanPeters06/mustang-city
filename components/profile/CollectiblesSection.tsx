import { COLLECTIBLES } from "@/lib/collectibles";
import type { ProgressSnapshot } from "@/lib/progress";

/** Profile: collectibles found / total; unfound ones stay secret. */
export default function CollectiblesSection({ snap, onOpen }: { snap: ProgressSnapshot; onOpen: (id: string) => void }) {
  const found = COLLECTIBLES.filter((c) => snap.finds[c.id]);
  return (
    <section>
      <h3 className="mb-2 text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">
        Collectibles · {found.length}/{COLLECTIBLES.length}
      </h3>
      <div className="grid grid-cols-6 gap-1.5">
        {COLLECTIBLES.map((c) =>
          snap.finds[c.id] ? (
            <button key={c.id} type="button" onClick={() => onOpen(c.id)} aria-label={c.name} className="flex aspect-square items-center justify-center border border-gold/60 bg-gold/15 text-[20px] text-gold">
              ◆
            </button>
          ) : (
            <span key={c.id} className="flex aspect-square items-center justify-center border border-white/10 bg-white/[0.03] text-[14px] text-ink/60" aria-label="Not found yet">
              ?
            </span>
          ),
        )}
      </div>
      <p className="mt-2 text-[12px] text-ink/60">Hidden around Forest State. They appear when you&apos;re within 50 m.</p>
    </section>
  );
}
