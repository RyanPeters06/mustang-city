"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildWrapped, drawFog, type WrappedData } from "@/lib/wrapped";
import { Emblem } from "../brand/Logo";
import { EASE_OUT } from "@/lib/motion";

const SLIDES = 5;
const SLIDE_MS = 6000;

const fmtPct = (p: number) => (p < 10 ? p.toFixed(2) : p.toFixed(1));

/** Graduation Wrapped: story slides from the player's own progress, ending in a shareable card. */
export default function Wrapped({ onClose }: { onClose: () => void }) {
  const data = useMemo(() => buildWrapped(), []);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [percentile, setPercentile] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/wrapped")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { percentile: number | null } | null) => setPercentile(j?.percentile ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (paused || i >= SLIDES - 1) return;
    const t = setTimeout(() => setI((n) => Math.min(SLIDES - 1, n + 1)), SLIDE_MS);
    return () => clearTimeout(t);
  }, [i, paused]);

  const next = () => setI((n) => Math.min(SLIDES - 1, n + 1));
  const prev = () => setI((n) => Math.max(0, n - 1));

  return (
    <motion.div
      className="absolute inset-0 z-[60] flex flex-col overflow-hidden bg-night"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-label="Your Forest State Wrapped"
      style={{ background: "radial-gradient(120% 70% at 50% 110%, #ff8a3d55, #7b2ff744 45%, transparent 80%), #140a2e" }}
    >
      {/* progress bars */}
      <div className="relative z-10 flex gap-1 px-4" style={{ paddingTop: "calc(var(--safe-top) + 10px)" }}>
        {Array.from({ length: SLIDES }, (_, n) => (
          <div key={n} className="h-[3px] flex-1 overflow-hidden bg-white/20">
            <div
              className="h-full bg-ink"
              style={{
                width: n < i ? "100%" : n === i ? "100%" : "0%",
                transition: n === i && !paused && i < SLIDES - 1 ? `width ${SLIDE_MS}ms linear` : "none",
              }}
              key={`${n}-${i}`}
            />
          </div>
        ))}
      </div>
      <div className="relative z-10 flex items-center justify-between px-4 pt-3">
        <p className="text-[12px] font-bold tracking-[0.3em] text-ink/70 uppercase">Forest State Wrapped</p>
        <button type="button" onClick={onClose} aria-label="Close Wrapped" className="flex h-11 w-11 items-center justify-center text-[22px] text-ink/80">
          ✕
        </button>
      </div>

      {/* tap zones (left = back, right = next); hold to pause */}
      <div
        className="relative flex-1"
        onPointerDown={() => setPaused(true)}
        onPointerUp={(e) => {
          setPaused(false);
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          if (i === SLIDES - 1) return;
          if (e.clientX - r.left < r.width * 0.3) prev();
          else next();
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            className="absolute inset-0 flex flex-col px-7 pt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
          >
            {i === 0 && <Intro data={data} />}
            {i === 1 && <Timelapse data={data} />}
            {i === 2 && <Numbers data={data} percentile={percentile} />}
            {i === 3 && <Places data={data} />}
            {i === 4 && <Share data={data} percentile={percentile} onClose={onClose} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] font-bold tracking-[0.3em] text-teal uppercase">{children}</p>;
}

function Intro({ data }: { data: WrappedData }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center pb-24 text-center">
      <Emblem size={120} />
      <Kicker>{data.name}, this was</Kicker>
      <h2
        className="font-display mt-2 text-[64px] leading-[0.85] uppercase"
        style={{
          background: "linear-gradient(180deg,#ffe3a3,#ff8a3d 45%,#ff4f8b 75%,#b04bff)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        Your
        <br />
        Forest State
      </h2>
      <p className="mt-4 text-[16px] text-ink/70">Tap to see what you uncovered.</p>
    </div>
  );
}

function Timelapse({ data }: { data: WrappedData }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth;
    const h = c.clientHeight;
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const total = data.cellsInOrder.length;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dur = reduced ? 0 : 4000;
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const k = dur ? Math.min(1, (now - t0) / dur) : 1;
      drawFog(ctx, w, h, data.cellsInOrder, Math.ceil(total * (1 - Math.pow(1 - k, 2))));
      if (k < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [data]);

  return (
    <>
      <Kicker>Every street you walked</Kicker>
      <p className="font-display mt-1 text-[44px] leading-none text-ink uppercase">
        {data.km2 < 1 ? `${Math.round(data.km2 * 100) / 100}` : data.km2.toFixed(1)} km²
      </p>
      <p className="text-[16px] text-ink/70">of fog cleared, in the order you cleared it.</p>
      <div className="relative mt-5">
        <canvas ref={ref} className="aspect-square w-full border border-white/10" aria-label="Animated map of the fog you cleared" />
        {data.cellsInOrder.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <p className="text-[16px] font-semibold text-ink">Your timelapse starts with your first walk</p>
            <p className="mt-1 text-[14px] text-ink/60">Every street you clear outside Mustang City lights up here, in order.</p>
          </div>
        )}
      </div>
      {data.walks > 0 && (
        <p className="mt-3 text-[14px] text-ink/60">
          {data.walks} recorded walk{data.walks === 1 ? "" : "s"} · {data.walkedKm.toFixed(1)} km
        </p>
      )}
    </>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="hud-panel px-4 py-3">
      <p className={`font-display text-[40px] leading-none ${color}`}>{value}</p>
      <p className="mt-1 text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">{label}</p>
    </div>
  );
}

function Numbers({ data, percentile }: { data: WrappedData; percentile: number | null }) {
  return (
    <>
      <Kicker>By the numbers</Kicker>
      <p className="font-display mt-1 text-[40px] leading-none text-ink uppercase">{data.rank}</p>
      <p className="text-[16px] text-ink/70">{data.rep.toLocaleString()} Rep earned</p>
      <div className="mt-6 grid grid-cols-2 gap-2.5">
        <Stat value={`${data.districtsUnlocked}/${data.totalRegions}`} label="regions claimed" color="text-gold" />
        <Stat value={`${fmtPct(data.pct)}%`} label="of London explored" color="text-teal" />
        <Stat value={String(data.missions)} label="missions passed" color="text-orange" />
        <Stat value={String(data.sideQuests)} label="side quests" color="text-pink" />
        <Stat value={String(data.lootStashed)} label="loot banked" color="text-purple" />
        <Stat value={String(data.streak)} label="day streak" color="text-orange" />
      </div>
      <p className="mt-5 text-[16px] text-ink/80">
        {percentile !== null ? (
          <>
            You explored more than <span className="font-bold text-gold">{percentile}%</span> of Western players.
          </>
        ) : (
          <span className="text-ink/60">Sign in to see how you rank against other Western players.</span>
        )}
      </p>
    </>
  );
}

function Places({ data }: { data: WrappedData }) {
  return (
    <div className="flex flex-1 flex-col justify-center pb-24">
      <Kicker>Your turf</Kicker>
      {data.topDistrict ? (
        <>
          <p className="font-display mt-2 text-[56px] leading-[0.9] text-ink uppercase">{data.topDistrict.name}</p>
          <p className="mt-2 text-[16px] text-ink/75">{Math.round(data.topDistrict.pct * 100)}% of it is yours.</p>
        </>
      ) : (
        <p className="font-display mt-2 text-[44px] leading-none text-ink uppercase">Still out there</p>
      )}
      <div className="sunset-rule my-8 w-40" />
      <Kicker>Your kind of mission</Kicker>
      <p className="font-display mt-2 text-[40px] leading-none text-ink uppercase">{data.topCategory ?? (data.missions ? "Street jobs" : "None yet")}</p>
      <p className="mt-2 text-[16px] text-ink/70">
        {data.landmarks} landmark{data.landmarks === 1 ? "" : "s"} · {data.photoMissions} photo job{data.photoMissions === 1 ? "" : "s"}
      </p>
    </div>
  );
}

/** 1080×1920 share card drawn on a canvas, shared as a PNG via Web Share (download fallback). */
async function renderCard(data: WrappedData, percentile: number | null): Promise<Blob> {
  const W = 1080;
  const H = 1920;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#140a2e");
  g.addColorStop(0.6, "#2a0f55");
  g.addColorStop(1, "#ff4f8b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const display = getComputedStyle(document.querySelector(".font-display") ?? document.body).fontFamily;
  const sans = getComputedStyle(document.body).fontFamily;

  // fog map
  const map = document.createElement("canvas");
  map.width = map.height = 920;
  drawFog(map.getContext("2d")!, 920, 920, data.cellsInOrder, data.cellsInOrder.length);
  ctx.drawImage(map, 80, 330);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  ctx.strokeRect(80, 330, 920, 920);

  ctx.fillStyle = "#2ee6d6";
  ctx.font = `700 34px ${sans}`;
  ctx.letterSpacing = "10px";
  ctx.fillText("FOREST STATE WRAPPED", 80, 150);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#f6efff";
  ctx.font = `110px ${display}`;
  ctx.fillText(data.name.toUpperCase().slice(0, 16), 80, 270);

  const rows: [string, string][] = [
    [`${data.districtsUnlocked}/${data.totalRegions}`, "REGIONS CLAIMED"],
    [String(data.missions), "MISSIONS PASSED"],
    [data.rank.toUpperCase(), `${data.rep.toLocaleString()} REP`],
  ];
  rows.forEach(([v, l], n) => {
    const y = 1390 + n * 150;
    ctx.fillStyle = ["#2ee6d6", "#ff8a3d", "#ffc857"][n];
    ctx.font = `100px ${display}`;
    ctx.fillText(v, 80, y);
    ctx.fillStyle = "rgba(246,239,255,0.8)";
    ctx.font = `700 30px ${sans}`;
    ctx.font = `100px ${display}`;
    const vw = ctx.measureText(v).width;
    ctx.font = `700 30px ${sans}`;
    ctx.fillText(l, 80 + vw + 28, y - 12);
  });
  if (percentile !== null) {
    ctx.fillStyle = "#f6efff";
    ctx.font = `600 34px ${sans}`;
    ctx.fillText(`Explored more than ${percentile}% of Western players`, 80, 1830);
  } else {
    ctx.fillStyle = "rgba(246,239,255,0.85)";
    ctx.font = `600 34px ${sans}`;
    ctx.fillText("mustangcity.rodeo · graduate knowing your city", 80, 1830);
  }
  return new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
}

function Share({ data, percentile, onClose }: { data: WrappedData; percentile: number | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let u: string | null = null;
    void renderCard(data, percentile).then((b) => {
      u = URL.createObjectURL(b);
      setBlob(b);
      setUrl(u);
    });
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [data, percentile]);

  async function share() {
    if (!blob) return;
    const file = new File([blob], "forest-state-wrapped.png", { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Forest State Wrapped" });
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    const a = document.createElement("a");
    a.href = url!;
    a.download = file.name;
    a.click();
    setMsg("Saved the image. Post it anywhere.");
  }

  return (
    <div className="flex flex-1 flex-col items-center pb-6">
      <Kicker>Your card</Kicker>
      <div className="mt-3 flex min-h-0 flex-1 items-center">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Your Wrapped share card" className="max-h-full w-auto border border-white/10 shadow-[0_20px_60px_-10px_rgba(255,79,139,0.6)]" style={{ maxHeight: "52vh" }} />
        ) : (
          <p className="animate-pulse text-ink/60">Printing your card…</p>
        )}
      </div>
      {msg && <p className="mt-2 text-[14px] text-teal">{msg}</p>}
      <div className="mt-4 grid w-full gap-2.5">
        <button
          type="button"
          disabled={!blob}
          onClick={share}
          className="min-h-[52px] bg-ink text-[16px] font-bold text-night disabled:opacity-50 rounded-full"
        >
          Share
        </button>
        <button type="button" onClick={onClose} className="min-h-[48px] text-[14px] font-bold text-ink/70 rounded-full">
          Back to the map
        </button>
      </div>
    </div>
  );
}
