"use client";

import { useState, useSyncExternalStore } from "react";
import { deleteTag, getServerTags, getTags, subscribeTags, toggleVote } from "@/lib/tags";
import { TAG_VOTE_REP } from "@/lib/tagRules";

const ago = (ms: number) => {
  const m = Math.round((Date.now() - ms) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
};

/** One geo-pinned tag: note, optional photo, author, upvote. */
export default function TagDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { tags } = useSyncExternalStore(subscribeTags, getTags, getServerTags);
  const tag = tags.find((t) => t.id === id);
  const [error, setError] = useState<string | null>(null);

  if (!tag) return <p className="pb-4 text-[14px] text-ink/60">This tag is gone.</p>;

  return (
    <div className="space-y-4 pb-4">
      <p className="text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">
        {tag.mine ? "Your tag" : `@${tag.author}`} · {ago(tag.createdAt)}
        {tag.kind === "demo" && <span className="text-gold"> · sample</span>}
        {tag.kind === "local" && <span className="text-gold"> · only on this phone</span>}
      </p>
      <figure className="rounded-2xl bg-white/[0.05] p-4">
        {tag.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tag.photo} alt="Photo pinned with this tag" className="mb-3 max-h-64 w-full rounded-xl object-cover" />
        )}
        <blockquote className="text-[16px] leading-snug text-ink">“{tag.note}”</blockquote>
      </figure>

      {error && (
        <p role="alert" className="rounded-2xl border border-pink/40 bg-pink/10 px-4 py-3 text-[14px] text-ink">
          {error}
        </p>
      )}

      {tag.mine ? (
        <div className="space-y-2.5">
          <p className="text-center text-[14px] text-ink/70">
            ▲ {tag.votes} upvote{tag.votes === 1 ? "" : "s"}
            {tag.kind === "server" && ` · +${tag.votes * TAG_VOTE_REP} Rep`}
          </p>
          <button
            type="button"
            onClick={async () => {
              const err = await deleteTag(tag.id);
              if (err) setError(err);
              else onClose();
            }}
            className="flex min-h-[48px] w-full items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-[16px] font-bold text-ink/80"
          >
            Delete tag
          </button>
        </div>
      ) : (
        <button
          type="button"
          aria-pressed={tag.voted}
          onClick={async () => setError(await toggleVote(tag.id))}
          className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full text-[16px] font-bold ${ tag.voted ? "border border-teal/50 bg-teal/15 text-teal" : "bg-teal text-night" }`}
        >
          ▲ {tag.voted ? "Upvoted" : "Upvote"} · {tag.votes}
        </button>
      )}
      {!tag.mine && tag.kind === "server" && (
        <p className="text-center text-[12px] text-ink/60">Upvotes give @{tag.author} +{TAG_VOTE_REP} Rep.</p>
      )}
    </div>
  );
}
