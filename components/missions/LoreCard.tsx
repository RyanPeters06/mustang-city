import { CATEGORY_LABEL, type Mission } from "@/lib/missions";

/** Archive card for a landmark: stored, sourced fact only. */
export default function LoreCard({ m, compact = false }: { m: Mission; compact?: boolean }) {
  if (!m.category || !m.brief) return null;
  return (
    <article className="relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/12 via-purple/10 to-transparent p-4">
      <p className="text-[11px] font-bold tracking-[0.16em] text-gold uppercase">
        {CATEGORY_LABEL[m.category]}
        {m.year ? ` · ${m.year}` : ""}
      </p>
      {!compact && <p className="font-display mt-1 text-[22px] leading-none text-ink uppercase">{m.title}</p>}
      <p className={`${compact ? "mt-1 line-clamp-2" : "mt-2"} text-[14px] leading-snug text-ink/85`}>{m.brief}</p>
      {m.sourceUrl && !compact && (
        <a href={m.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[12px] font-semibold text-teal underline">
          Source: {m.sourceName ?? "link"}
        </a>
      )}
    </article>
  );
}
