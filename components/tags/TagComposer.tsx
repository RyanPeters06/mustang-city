"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { createTag, getServerTags, getTags, subscribeTags } from "@/lib/tags";
import { TAG_MAX_CHARS, TAG_MAX_PHOTO_B64, noteProblem } from "@/lib/tagRules";
import { REVEAL_ACCURACY_M, startWatching } from "@/lib/location";
import { useLastFix } from "@/lib/useLastFix";
import { preparePhoto } from "@/lib/photo";

/** Leave a note (and optionally a photo) pinned to the cell you're standing in. */
export default function TagComposer({ onDone }: { onDone: (id: string) => void }) {
  const { mode } = useSyncExternalStore(subscribeTags, getTags, getServerTags);
  const fix = useLastFix(800);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const accurate = !!fix && fix.accuracy <= REVEAL_ACCURACY_M;

  async function post() {
    if (!fix) return;
    const problem = noteProblem(note);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    const res = await createTag(fix, note, photo ?? undefined);
    setBusy(false);
    if (res.ok) onDone(res.tag.id);
    else setError(res.message);
  }

  return (
    <div className="space-y-4 pb-4">
      <p className="text-[14px] text-ink/70">
        Pin a note to this exact spot. Other players only find it once they clear the fog here.
        {mode === "local" && " You're not signed in, so it stays on this phone for now."}
      </p>

      <label className="block">
        <span className="sr-only">Your note</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, TAG_MAX_CHARS))}
          rows={3}
          placeholder="Best study spot nobody knows about…"
          className="w-full resize-none rounded-2xl border border-white/12 bg-white/[0.05] p-4 text-[16px] text-ink placeholder:text-ink/35 focus:border-teal focus:outline-none"
        />
        <span className="mt-1 block text-right text-[12px] text-ink/45">
          {note.length}/{TAG_MAX_CHARS}
        </span>
      </label>

      {photo ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="Photo to pin" className="h-16 w-16 rounded-xl object-cover" />
          <button type="button" onClick={() => setPhoto(null)} className="min-h-[44px] text-[14px] font-semibold text-ink/70 underline">
            Remove photo
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="min-h-[44px] text-[14px] font-semibold text-teal underline"
        >
          + Add a photo (optional)
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            const { thumb } = await preparePhoto(file);
            if (thumb.length > TAG_MAX_PHOTO_B64) return setError("That photo is too big.");
            setPhoto(thumb);
          } catch {
            setError("Couldn't read that photo.");
          }
        }}
      />

      {error && (
        <p role="alert" className="rounded-2xl border border-pink/40 bg-pink/10 px-4 py-3 text-[14px] text-ink">
          {error}
        </p>
      )}

      {!fix ? (
        <button type="button" onClick={startWatching} className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-teal text-[16px] font-bold text-night uppercase">
          Turn on location
        </button>
      ) : !accurate ? (
        <p className="rounded-2xl bg-gold/10 px-4 py-3 text-center text-[14px] text-gold">
          GPS too rough (±{Math.round(fix.accuracy)} m) to pin a tag. Step outside.
        </p>
      ) : (
        <button
          type="button"
          disabled={busy || note.trim().length < 2}
          onClick={post}
          className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-pink text-[16px] font-bold tracking-wide text-night uppercase disabled:opacity-50"
        >
          {busy ? "Pinning…" : "Pin it here"}
        </button>
      )}
    </div>
  );
}
