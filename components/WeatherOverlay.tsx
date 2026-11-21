"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { getServerWeather, getWeather, subscribeWeather } from "@/lib/weather";

/** Rain / snow particles over the map when it's actually raining or snowing in London (brief → Live weather). */
export default function WeatherOverlay() {
  const w = useSyncExternalStore(subscribeWeather, getWeather, getServerWeather);
  const ref = useRef<HTMLCanvasElement>(null);
  const wet = w.kind === "rain" || w.kind === "storm" || w.kind === "snow";

  useEffect(() => {
    const c = ref.current;
    if (!c || !wet) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      c.width = c.clientWidth * dpr;
      c.height = c.clientHeight * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    const ctx = c.getContext("2d")!;
    const snow = w.kind === "snow";
    const n = Math.round((snow ? 90 : 140) * w.intensity * (c.clientWidth / 400) + 20);
    const ps = Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random(), drift: Math.random() * Math.PI * 2 }));
    let raf = 0;
    let last = performance.now();
    let flash = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const W = c.width;
      const H = c.height;
      ctx.clearRect(0, 0, W, H);
      if (w.kind === "storm" && Math.random() < 0.002) flash = 1;
      if (flash > 0) {
        ctx.fillStyle = `rgba(200,190,255,${flash * 0.25})`;
        ctx.fillRect(0, 0, W, H);
        flash = Math.max(0, flash - dt * 3);
      }
      ctx.strokeStyle = snow ? "rgba(246,239,255,0.85)" : "rgba(170,200,255,0.45)";
      ctx.fillStyle = "rgba(246,239,255,0.85)";
      ctx.lineWidth = dpr;
      for (const p of ps) {
        if (!reduced) {
          if (snow) {
            p.drift += dt;
            p.y += dt * 0.06 * p.s;
            p.x += Math.sin(p.drift) * dt * 0.01;
          } else {
            p.y += dt * 1.1 * p.s;
            p.x -= dt * 0.12 * p.s;
          }
          if (p.y > 1) {
            p.y = -0.05;
            p.x = Math.random() * 1.1;
          }
          if (p.x < -0.05) p.x += 1.1;
        }
        const x = p.x * W;
        const y = p.y * H;
        if (snow) {
          ctx.beginPath();
          ctx.arc(x, y, 1.6 * dpr * p.s, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 3 * dpr * p.s, y - 14 * dpr * p.s);
          ctx.stroke();
        }
      }
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [wet, w.kind, w.intensity]);

  if (!wet && w.kind !== "fog") return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
      {w.kind === "fog" && <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/5 to-transparent" />}
      {wet && <canvas ref={ref} className="h-full w-full" />}
      {wet && <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(20,10,46,0.25), transparent 40%)" }} />}
    </div>
  );
}
