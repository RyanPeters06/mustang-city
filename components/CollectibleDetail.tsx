import { COLLECTIBLES, COLLECTIBLE_REP } from "@/lib/collectibles";

/** Lore card for a found collectible: one stored, sourced fact. */
export default function CollectibleDetail({ id }: { id: string }) {
  const c = COLLECTIBLES.find((x) => x.id === id);
  if (!c) return null;
  return (
    <div className="space-y-4 pb-4">
      <p className="text-[12px] font-bold tracking-[0.14em] text-gold uppercase">Collectible · +{COLLECTIBLE_REP} Rep</p>
      <article className="hud-panel p-4">
        <p className="text-[16px] leading-snug text-ink">{c.lore}</p>
        <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block min-h-[44px] pt-3 text-[13px] font-semibold text-teal underline rounded-full">
          Source: {c.sourceName}
        </a>
      </article>
    </div>
  );
}
