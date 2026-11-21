"use client";

import { useSyncExternalStore } from "react";
import { getServerTags, getTags, subscribeTags } from "@/lib/tags";

/** Profile: tags you've pinned and tags you've found under the fog. */
export default function TagsSection({ onOpen }: { onOpen: (id: string) => void }) {
  const { tags } = useSyncExternalStore(subscribeTags, getTags, getServerTags);
  const mine = tags.filter((t) => t.mine);
  const found = tags.filter((t) => !t.mine);
  const h = "mb-2 text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase";

  const row = (t: (typeof tags)[number]) => (
    <li key={t.id}>
      <button type="button" onClick={() => onOpen(t.id)} className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.04] p-2.5 text-left">
        {t.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.photo} alt="" className="h-11 w-11 rounded-xl object-cover" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[16px] text-ink" aria-hidden>
            ✎
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] text-ink">{t.note}</span>
          <span className="block text-[12px] text-ink/50">
            {t.mine ? "You" : `@${t.author}`}
            {t.kind === "demo" ? " · sample" : ""}
          </span>
        </span>
        <span className="text-[13px] font-bold text-teal">▲ {t.votes}</span>
      </button>
    </li>
  );

  return (
    <section>
      <h3 className={h}>Tags</h3>
      {tags.length === 0 ? (
        <p className="text-[14px] text-ink/60">No tags yet. Pin one from the map, or clear more fog to find others&apos;.</p>
      ) : (
        <div className="space-y-3">
          {mine.length > 0 && <ul className="space-y-2">{mine.map(row)}</ul>}
          {found.length > 0 && (
            <>
              <p className="text-[12px] text-ink/50">Found under the fog · {found.length}</p>
              <ul className="space-y-2">{found.map(row)}</ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
