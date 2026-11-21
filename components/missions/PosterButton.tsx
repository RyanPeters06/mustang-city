"use client";

import { useState } from "react";
import { photoFor, renderPoster, sharePoster } from "@/lib/poster";
import { CATEGORY_LABEL, type Mission } from "@/lib/missions";

/** "Share poster" for a passed photo mission, with a preview. */
export default function PosterButton({ m, thumb, at }: { m: Mission; thumb?: string; at: number }) {
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const photo = photoFor(m.slug, thumb);
  if (!photo) return null;

  async function make() {
    setBusy(true);
    const blob = await renderPoster({ photo: photo!, title: m.title, rep: m.rep, date: at, kicker: m.category ? CATEGORY_LABEL[m.category] : "Mustang City" });
    setPreview({ url: URL.createObjectURL(blob), blob });
    setBusy(false);
  }

  return (
    <div className="space-y-2.5">
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.url} alt={`Poster for ${m.title}`} className="w-full border border-white/10" />
      )}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!preview) return make();
          const r = await sharePoster(preview.blob, m.slug);
          if (r === "saved") setNote("Poster saved. Post it anywhere.");
        }}
        className="flex min-h-[52px] w-full items-center justify-center bg-gradient-to-r from-gold via-orange to-pink text-[15px] font-bold tracking-[0.2em] text-night uppercase disabled:opacity-60"
        style={{ clipPath: "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)" }}
      >
        {busy ? "Printing…" : preview ? "Share poster" : "Make a poster"}
      </button>
      {note && <p className="text-center text-[13px] text-teal">{note}</p>}
    </div>
  );
}
