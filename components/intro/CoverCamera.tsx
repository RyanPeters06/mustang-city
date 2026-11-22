"use client";
/**
 * The title-screen cover as a camera move over separate layers (one per panel + the logo, from
 * lib/data/coverLayers.json written by scripts/build-cover.mjs). Everything runs as Web Animations on
 * `transform`/`opacity`, i.e. on the compositor, so the Mapbox load underneath can't stutter it.
 *
 *   open   → fade up from black, centred on the logo and slightly zoomed in
 *   settle → ease back to the whole cover
 *   idle   → slow breathing around the logo
 *   start  → the panels burst outward away from the title, then the camera dives into the
 *            "MUSTANG CITY" lettering (the white flash and the map flight take over from there)
 *
 * Camera shots are "put this cover point at this spot on screen, at this zoom", clamped so the cover always
 * fills the screen while it's whole.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import layers from "@/lib/data/coverLayers.json";
import { LogoGlint } from "./TitleFx";

const IMG_W = layers.w;
const IMG_H = layers.h;
const LOGO = { x: layers.logo.x + layers.logo.w / 2, y: layers.logo.y + layers.logo.h / 2 };

/** Panel burst, then the dive into the lettering (overlapping); Intro waits this long before the map flight. */
const BURST_MS = 780;
const ZOOM_DELAY_MS = 380;
const ZOOM_MS = 820;
export const DIVE_MS = ZOOM_DELAY_MS + ZOOM_MS;

type Pt = { x: number; y: number };
type Box = { W: number; H: number; k: number; ox: number; oy: number };

const measure = (el: HTMLElement): Box => {
  const W = el.clientWidth;
  const H = el.clientHeight;
  const k = Math.max(W / IMG_W, H / IMG_H); // fit like background-size: cover, centred
  return { W, H, k, ox: (W - IMG_W * k) / 2, oy: (H - IMG_H * k) / 2 };
};

function shot(b: Box, p: Pt, s: number, at?: Pt, clamp = true) {
  const P = { x: b.ox + p.x * b.k, y: b.oy + p.y * b.k };
  const C = at ?? P; // default: the point stays put on screen and we zoom into it
  let tx = C.x - s * P.x;
  let ty = C.y - s * P.y;
  if (clamp) {
    tx = Math.min(-s * b.ox, Math.max(b.W - s * (b.ox + IMG_W * b.k), tx));
    ty = Math.min(-s * b.oy, Math.max(b.H - s * (b.oy + IMG_H * b.k), ty));
  }
  return `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s})`;
}

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

export default function CoverCamera({ dive }: { dive: boolean }) {
  const camRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLImageElement | null)[]>([]);
  const logoRef = useRef<HTMLImageElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [idle, setIdle] = useState(false);

  // Size the art like background-size: cover, and keep it right if the screen resizes.
  useLayoutEffect(() => {
    const el = camRef.current;
    if (!el) return;
    const update = () => setBox(measure(el));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Hold everything until every layer has downloaded, or the move plays out half-drawn.
  useEffect(() => {
    let left = layers.panels.length + 1;
    const done = () => --left === 0 && setLoaded(true);
    for (const src of [...layers.panels.map((p) => p.src), layers.logo.src]) {
      const img = new Image();
      img.onload = img.onerror = done;
      img.src = src;
    }
  }, []);

  // Open → pull back → breathe.
  useEffect(() => {
    const el = camRef.current;
    if (!el || !loaded || dive) return;
    const b = measure(el);
    const full = shot(b, LOGO, 1);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.transform = full;
      el.style.opacity = "1";
      return;
    }
    // Open centred on the logo, a little zoomed in, and settle back to the whole cover while fading up from black.
    const open = shot(b, LOGO, 1.18);
    const breathe = shot(b, LOGO, 1.035);
    const fade = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, fill: "forwards", easing: "ease-out" });
    const pull = el.animate([{ transform: open }, { transform: full }], {
      duration: 2200,
      fill: "forwards",
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
    let loop: Animation | null = null;
    pull.onfinish = () => {
      loop = el.animate([{ transform: full, opacity: 1 }, { transform: breathe, opacity: 1 }], {
        duration: 7000,
        iterations: Infinity,
        direction: "alternate",
        easing: "ease-in-out",
      });
      setIdle(true);
    };
    return () => {
      // Freeze wherever the camera is, so the start animation begins from there with no jump.
      const now = getComputedStyle(el).transform;
      fade.cancel();
      pull.cancel();
      loop?.cancel();
      el.style.transform = now === "none" ? full : now;
      el.style.opacity = "1";
    };
  }, [loaded, dive]);

  // Start: panels burst away from the title, then the camera dives into the lettering.
  useEffect(() => {
    const el = camRef.current;
    if (!el || !dive) return;
    const b = measure(el);
    const fly = Math.hypot(b.W, b.H) * 1.1; // far enough that every panel clears the screen
    const anims: Animation[] = [];
    layers.panels.forEach((p, i) => {
      const img = panelRefs.current[i];
      if (!img) return;
      // Middle row (the panels beside the title) shoots straight out sideways; the top and bottom rows fly
      // directly away from the logo.
      const middleRow = p.y > IMG_H * 0.15 && p.y + p.h < IMG_H * 0.8;
      const dx = p.cx - LOGO.x;
      const dy = middleRow ? 0 : p.cy - LOGO.y;
      const len = Math.hypot(dx, dy) || 1;
      const spin = (dx >= 0 ? 1 : -1) * (10 + (i % 3) * 6);
      anims.push(
        img.animate(
          [
            { transform: "translate(0px, 0px) rotate(0deg) scale(1)" },
            { transform: `translate(${((dx / len) * fly).toFixed(1)}px, ${((dy / len) * fly).toFixed(1)}px) rotate(${spin}deg) scale(1.15)` },
          ],
          { duration: BURST_MS, delay: i * 25, fill: "forwards", easing: "cubic-bezier(0.55, 0, 0.8, 0.2)" },
        ),
      );
    });
    // The logo gives a small punch as the panels leave it...
    if (logoRef.current) {
      anims.push(
        logoRef.current.animate([{ transform: "scale(1)" }, { transform: "scale(1.12)" }], { duration: ZOOM_DELAY_MS, fill: "forwards", easing: "cubic-bezier(0.2, 0.8, 0.3, 1)" }),
      );
    }
    // ...then the camera rushes into the lettering. No clamp: the panels are gone, black is fine.
    const from = getComputedStyle(el).transform;
    const start = from === "none" ? shot(b, LOGO, 1) : from;
    anims.push(
      el.animate([{ transform: start }, { transform: shot(b, layers.words, 7, undefined, false) }], {
        duration: ZOOM_MS,
        delay: ZOOM_DELAY_MS,
        fill: "forwards",
        easing: "cubic-bezier(0.6, 0, 0.9, 0.4)",
      }),
    );
    return () => anims.forEach((a) => a.cancel());
  }, [dive]);

  const art = box && { left: box.ox, top: box.oy, width: IMG_W * box.k, height: IMG_H * box.k };

  return (
    <div className="absolute inset-0 overflow-hidden bg-black" aria-hidden>
      <div ref={camRef} className="absolute inset-0 will-change-transform" style={{ transformOrigin: "0 0", opacity: 0 }}>
        {art && (
          <div className="absolute" style={art}>
            {layers.panels.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- plain layers moved by Web Animations
              <img
                key={p.src}
                ref={(n) => {
                  panelRefs.current[i] = n;
                }}
                src={p.src}
                alt=""
                draggable={false}
                className="absolute select-none will-change-transform"
                style={{ left: pct(p.x, IMG_W), top: pct(p.y, IMG_H), width: pct(p.w, IMG_W), height: pct(p.h, IMG_H) }}
              />
            ))}
            {/* eslint-disable-next-line @next/next/no-img-element -- plain layer moved by Web Animations */}
            <img
              ref={logoRef}
              src={layers.logo.src}
              alt=""
              draggable={false}
              className="absolute select-none will-change-transform"
              style={{
                left: pct(layers.logo.x, IMG_W),
                top: pct(layers.logo.y, IMG_H),
                width: pct(layers.logo.w, IMG_W),
                height: pct(layers.logo.h, IMG_H),
                filter: "drop-shadow(0 0 14px rgba(0,0,0,0.75)) drop-shadow(0 8px 0 rgba(0,0,0,0.9))",
              }}
            />
            {idle && !dive && (
              <LogoGlint box={{ cx: LOGO.x / IMG_W, cy: LOGO.y / IMG_H, h: layers.logo.h / IMG_H, aspect: layers.logo.w / layers.logo.h }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
