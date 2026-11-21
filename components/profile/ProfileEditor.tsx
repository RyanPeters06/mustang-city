"use client";

import { useState } from "react";
import { ACCENTS, EMBLEMS, FACULTIES, emblemUnlocked, unlockLabel, updateProfile, type Profile, type ProgressSnapshot } from "@/lib/progress";
import { missionBySlug } from "@/lib/missions";
import Emblem from "./Emblem";
import { BADGES } from "@/lib/badges";

const YEARS = ["", "1st year", "2nd year", "3rd year", "4th year", "5th+ year", "Grad"];

export default function ProfileEditor({ snap, onClose }: { snap: ProgressSnapshot; onClose: () => void }) {
  const [draft, setDraft] = useState<Profile>(snap.profile);
  const set = (patch: Partial<Profile>) => setDraft((d) => ({ ...d, ...patch }));
  const nameOk = draft.name.trim().length === 0 || /^[\p{L}\p{N} ._-]{3,20}$/u.test(draft.name.trim());
  const photos = Object.values(snap.completions).filter((c) => c.thumb);
  const earned = BADGES.filter((b) => snap.badges[b.code]);

  const field = "w-full rounded-xl border border-white/12 bg-white/[0.06] px-3.5 py-3 text-[16px] text-ink outline-none focus:border-pink";

  return (
    <div className="space-y-5 pb-4">
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">Display name</span>
        <input
          className={field}
          value={draft.name}
          maxLength={20}
          placeholder="3–20 letters, numbers, . _ -"
          onChange={(e) => set({ name: e.target.value })}
          autoComplete="nickname"
        />
        {!nameOk && <span className="mt-1 block text-[12px] text-pink">Use 3–20 letters, numbers, spaces, . _ or -</span>}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">Faculty</span>
          <select className={field} value={draft.faculty} onChange={(e) => set({ faculty: e.target.value })}>
            <option value="">Pick one</option>
            {FACULTIES.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">Year</span>
          <select className={field} value={draft.year} onChange={(e) => set({ year: e.target.value })}>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y || "Prefer not to say"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">Emblem</legend>
        <div className="grid grid-cols-4 gap-2.5">
          {EMBLEMS.map((e) => {
            const unlocked = emblemUnlocked(e.id, snap);
            const on = draft.emblem === e.id;
            return (
              <button
                key={e.id}
                type="button"
                disabled={!unlocked}
                onClick={() => set({ emblem: e.id })}
                aria-pressed={on}
                aria-label={unlocked ? e.name : `${e.name}, unlocks at ${unlockLabel(e.id)}`}
                className={`flex flex-col items-center gap-1 rounded-2xl p-2 ${on ? "bg-white/10 ring-2 ring-pink" : ""}`}
              >
                <Emblem id={e.id} accent={draft.accent} size={48} locked={!unlocked} />
                <span className="text-[12px] font-semibold text-ink/60">{unlocked ? e.name : `🔒 ${unlockLabel(e.id)}`}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {earned.length > 0 && (
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">Title</span>
          <select className={field} value={draft.title} onChange={(e) => set({ title: e.target.value })}>
            <option value="">No title</option>
            {earned.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset>
        <legend className="mb-2 text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">Accent</legend>
        <div className="flex gap-3">
          {ACCENTS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set({ accent: c })}
              aria-label={`Accent ${c}`}
              aria-pressed={draft.accent === c}
              className={`h-11 w-11 rounded-full ${draft.accent === c ? "ring-2 ring-white ring-offset-2 ring-offset-night" : ""}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </fieldset>

      {photos.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">Showcase (pick up to 3)</legend>
          <div className="grid grid-cols-4 gap-2">
            {photos.map((c) => {
              const on = draft.showcase.includes(c.slug);
              return (
                <button
                  key={c.slug}
                  type="button"
                  aria-pressed={on}
                  aria-label={missionBySlug(c.slug)?.title}
                  onClick={() =>
                    set({ showcase: on ? draft.showcase.filter((s) => s !== c.slug) : [...draft.showcase, c.slug].slice(-3) })
                  }
                  className={`relative aspect-square overflow-hidden rounded-xl ${on ? "ring-2 ring-gold" : "opacity-70"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.thumb} alt="" className="h-full w-full object-cover" />
                  {on && <span className="absolute top-1 right-1 rounded-full bg-gold px-1.5 text-[12px] font-bold text-night">★</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={onClose} className="min-h-[52px] rounded-full bg-white/[0.06] text-[16px] font-bold text-ink">
          Cancel
        </button>
        <button
          type="button"
          disabled={!nameOk}
          onClick={() => {
            updateProfile({ ...draft, name: draft.name.trim() });
            onClose();
          }}
          className="min-h-[52px] rounded-full btn-sunset text-[16px] font-bold text-night disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
