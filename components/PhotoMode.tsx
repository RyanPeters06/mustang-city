"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";
import { DISTRICTS } from "@/lib/districts";
import { recordReel } from "@/lib/reel";
import type { MapHandle } from "./map/MapView";
import { districtAt } from "@/lib/districts";

/**
 * Photo mode (IDEAS §1): hides the UI, letterboxes the map with a film-grain finish and a postcard stamp,
 * and captures a shareable image (Web Share where available, otherwise a download).
 */
export default function PhotoMode({ map }: { map: RefObject<MapHandle | null> }) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState<string | null>(null);
  const [reel, setReel] = useState<{ url: string; blob: Blob; ext: string } | null>(null);
  const [recording, setRecording] = useState<number | null>(null);
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (on) document.documentElement.setAttribute("data-photo", "1");
    else document.documentElement.removeAttribute("data-photo");
    return () => document.documentElement.removeAttribute("data-photo");
  }, [on]);

  const center = map.current?.center();
  const place = (center && districtAt(center)) || "Forest State";
  const date = new Date().toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });

  async function capture() {
    setBusy(true);
    const frame = await map.current?.snapshot();
    if (!frame) return setBusy(false);
    const img = new Image();
    img.src = frame;
    await img.decode().catch(() => {});
    const W = img.naturalWidth || 1080;
    const H = img.naturalHeight || 1920;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    g.drawImage(img, 0, 0, W, H);
    // sunset grade
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "rgba(123,47,247,0.18)");
    grad.addColorStop(1, "rgba(255,79,139,0.16)");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // grain
    const noise = g.getImageData(0, 0, W, H);
    for (let i = 0; i < noise.data.length; i += 4 * 3) {
      const n = (Math.random() - 0.5) * 22;
      noise.data[i] += n;
      noise.data[i + 1] += n;
      noise.data[i + 2] += n;
    }
    g.putImageData(noise, 0, 0);
    // letterbox + stamp
    const bar = Math.round(H * 0.09);
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, bar);
    g.fillRect(0, H - bar, W, bar);
    const s = W / 390;
    g.fillStyle = "#FFC857";
    g.font = `700 ${Math.round(11 * s)}px sans-serif`;
    g.fillText(`FOREST STATE · ${place.toUpperCase()}`, 18 * s, H - bar + bar * 0.42);
    g.fillStyle = "rgba(246,239,255,0.7)";
    g.font = `500 ${Math.round(10 * s)}px sans-serif`;
    g.fillText(`${date} · mustangcity.rodeo`, 18 * s, H - bar + bar * 0.72);
    const url = c.toDataURL("image/jpeg", 0.9);
    setShot(url);
    setBusy(false);
  }

  async function makeReel() {
    const m = map.current;
    if (!m) return;
    setRecording(0);
    const out = await recordReel(
      m,
      { name: snap.profile.name || "Player one", regions: snap.regionsClaimed, totalRegions: DISTRICTS.length, rep: snap.rep, streak: snap.streak, rank: snap.rank },
      (p) => setRecording(p),
    );
    setRecording(null);
    if (out) setReel({ url: URL.createObjectURL(out.blob), blob: out.blob, ext: out.ext });
  }

  async function shareReel() {
    if (!reel) return;
    const file = new File([reel.blob], `mustang-city-reel.${reel.ext}`, { type: reel.blob.type });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "My Forest State reel" }).catch(() => {});
    else {
      const a = document.createElement("a");
      a.href = reel.url;
      a.download = file.name;
      a.click();
    }
  }

  async function share() {
    if (!shot) return;
    const blob = await (await fetch(shot)).blob();
    const file = new File([blob], `mustang-city-${Date.now()}.jpg`, { type: "image/jpeg" });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Mustang City" }).catch(() => {});
    } else {
      const a = document.createElement("a");
      a.href = shot;
      a.download = file.name;
      a.click();
    }
  }

  const exit = () => {
    setShot(null);
    if (reel) URL.revokeObjectURL(reel.url);
    setReel(null);
    setOn(false);
  };

  return (
    <>
      {!on && (
        <button
          type="button"
          onClick={() => setOn(true)}
          aria-label="Photo mode"
          className="rise-in glass absolute right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full text-ink/80 active:scale-95"
          style={{ animationDelay: "0ms", bottom: "calc(var(--safe-bottom) + 408px)" }}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 8h3l2-3h6l2 3h3v11H4z M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
          </svg>
        </button>
      )}
      <AnimatePresence>
        {on && (
          <motion.div key="photo" data-photo-keep className="absolute inset-0 z-[47]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* letterbox + grain preview (the map stays interactive between the bars) */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[9%] bg-black" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[9%] bg-black" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-purple/15 to-pink/15 mix-blend-soft-light" />
            <div className="pointer-events-none absolute left-5" style={{ bottom: "calc(9% - 34px)" }}>
              <p className="text-[11px] font-bold tracking-[0.2em] text-gold uppercase">Forest State · {place}</p>
              <p className="text-[10px] text-ink/70">{date} · mustangcity.rodeo</p>
            </div>
            <div className="absolute inset-x-0 flex justify-center gap-3" style={{ top: "calc(var(--safe-top) + 16px)" }}>
              <button type="button" onClick={exit} className="glass min-h-[44px] rounded-full px-5 text-[14px] font-bold text-ink">
                Done
              </button>
              <button type="button" onClick={capture} disabled={busy || recording !== null} className="btn-sunset min-h-[44px] rounded-full px-6 text-[14px] font-bold disabled:opacity-60">
                {busy ? "Developing…" : "Capture"}
              </button>
              <button type="button" onClick={makeReel} disabled={busy || recording !== null} className="glass min-h-[44px] rounded-full px-5 text-[14px] font-bold text-pink disabled:opacity-70">
                {recording !== null ? `Recording ${Math.round(recording * 100)}%` : "Record reel"}
              </button>
            </div>
            {reel && (
              <motion.div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <video src={reel.url} autoPlay loop muted playsInline className="max-h-[70%] rounded-2xl shadow-2xl ring-4 ring-white/90" />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setReel(null)} className="glass min-h-[44px] rounded-full px-5 text-[14px] font-bold text-ink">
                    Back
                  </button>
                  <button type="button" onClick={shareReel} className="btn-sunset min-h-[44px] rounded-full px-6 text-[14px] font-bold">
                    Share reel
                  </button>
                </div>
              </motion.div>
            )}
            {shot && (
              <motion.div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
                <img src={shot} alt="Your Forest State postcard" className="max-h-[70%] rounded-2xl shadow-2xl ring-4 ring-white/90" />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShot(null)} className="glass min-h-[44px] rounded-full px-5 text-[14px] font-bold text-ink">
                    Retake
                  </button>
                  <button type="button" onClick={share} className="btn-sunset min-h-[44px] rounded-full px-6 text-[14px] font-bold">
                    Share
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
