"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLastFix } from "@/lib/useLastFix";
import { MISSIONS } from "@/lib/missions";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";
import { getServerTags, getTags, subscribeTags } from "@/lib/tags";
import { onBusFrame } from "@/lib/buses";
import { routeById } from "@/lib/ltcData";
import { COLLECTIBLES } from "@/lib/collectibles";
import { CAMPUS_CENTER, type LngLat } from "@/lib/geo";
import type { Vehicle } from "@/lib/ltc";

const RANGE_M = 600;
const SIZE = 92;
const TYPE_COLOR: Record<string, string> = { photo: "#ff4f8b", checkin: "#ff8a3d", bus: "#2ee6d6", heist: "#7b2ff7", landmark: "#ffc857" };

/** Corner radar (brief → "radar-style HUD"): nearby missions, buses, found collectibles and tags, north up. */
export default function Radar() {
  const fix = useLastFix(1000);
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { tags } = useSyncExternalStore(subscribeTags, getTags, getServerTags);
  const latest = useRef<Vehicle[]>([]);
  const [buses, setBuses] = useState<Vehicle[]>([]);

  useEffect(() => {
    const off = onBusFrame((v) => (latest.current = v));
    const t = setInterval(() => setBuses(latest.current), 3000);
    return () => {
      off();
      clearInterval(t);
    };
  }, []);

  const center: LngLat = fix?.lngLat ?? CAMPUS_CENTER;
  const k = Math.cos((center[1] * Math.PI) / 180);
  const r = SIZE / 2 - 4;
  const project = ([lng, lat]: LngLat) => {
    const dx = (lng - center[0]) * 111320 * k;
    const dy = (lat - center[1]) * 111320;
    const d = Math.hypot(dx, dy);
    if (d > RANGE_M) return null;
    return [SIZE / 2 + (dx / RANGE_M) * r, SIZE / 2 - (dy / RANGE_M) * r] as const;
  };

  const blips: { key: string; x: number; y: number; color: string; shape: "dot" | "square" | "diamond" }[] = [];
  for (const m of MISSIONS) {
    if (snap.completions[m.slug]) continue;
    const p = project(m.lngLat);
    if (p) blips.push({ key: m.slug, x: p[0], y: p[1], color: TYPE_COLOR[m.category ? "landmark" : m.type], shape: "dot" });
  }
  for (const v of buses) {
    const p = project(v.lngLat);
    if (p) blips.push({ key: v.id, x: p[0], y: p[1], color: routeById(v.route)?.color ?? "#2ee6d6", shape: "square" });
  }
  for (const c of COLLECTIBLES) {
    if (!snap.finds[c.id]) continue;
    const p = project(c.lngLat);
    if (p) blips.push({ key: c.id, x: p[0], y: p[1], color: "#ffc857", shape: "diamond" });
  }
  for (const t of tags) {
    const p = project(t.lngLat);
    if (p) blips.push({ key: t.id, x: p[0], y: p[1], color: "#f6efff", shape: "square" });
  }

  return (
    <div
      className="rise-in pointer-events-none absolute right-4 z-20"
      style={{ top: "calc(var(--safe-top) + 84px)", width: SIZE, height: SIZE, animationDelay: "80ms" }}
      role="img"
      aria-label={`Radar: ${blips.length} things within ${RANGE_M} metres`}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <defs>
          <radialGradient id="radar-bg">
            <stop offset="0" stopColor="#1d0f45" stopOpacity="0.92" />
            <stop offset="1" stopColor="#0b0618" stopOpacity="0.92" />
          </radialGradient>
          <linearGradient id="radar-sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2ee6d6" stopOpacity="0" />
            <stop offset="1" stopColor="#2ee6d6" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - 1} fill="url(#radar-bg)" stroke="rgba(255,255,255,0.18)" />
        <circle cx={SIZE / 2} cy={SIZE / 2} r={r / 2} fill="none" stroke="rgba(46,230,214,0.18)" />
        <path d={`M${SIZE / 2} 4V${SIZE - 4}M4 ${SIZE / 2}H${SIZE - 4}`} stroke="rgba(46,230,214,0.12)" />
        <g className="origin-center animate-[spin_4s_linear_infinite] motion-reduce:hidden" style={{ transformOrigin: "50% 50%" }}>
          <path d={`M${SIZE / 2} ${SIZE / 2} L${SIZE / 2} 4 A${r + 1} ${r + 1} 0 0 1 ${SIZE / 2 + (r + 1) * Math.sin(Math.PI / 4)} ${SIZE / 2 - (r + 1) * Math.cos(Math.PI / 4)} Z`} fill="url(#radar-sweep)" />
        </g>
        {blips.map((b) =>
          b.shape === "dot" ? (
            <circle key={b.key} cx={b.x} cy={b.y} r={3.2} fill={b.color} stroke="#140a2e" strokeWidth={1} />
          ) : b.shape === "diamond" ? (
            <rect key={b.key} x={b.x - 3} y={b.y - 3} width={6} height={6} fill={b.color} transform={`rotate(45 ${b.x} ${b.y})`} />
          ) : (
            <rect key={b.key} x={b.x - 2.5} y={b.y - 2.5} width={5} height={5} fill={b.color} stroke="#140a2e" strokeWidth={0.8} />
          ),
        )}
        {/* player */}
        <g transform={`translate(${SIZE / 2} ${SIZE / 2}) rotate(${fix?.heading ?? 0})`}>
          <path d="M0 -6 L4.5 5 L0 2.5 L-4.5 5 Z" fill={fix ? "#2ee6d6" : "rgba(246,239,255,0.4)"} stroke="#140a2e" strokeWidth={1} />
        </g>
        <text x={SIZE / 2} y={12} textAnchor="middle" fontSize={8} fontWeight={700} fill="rgba(246,239,255,0.7)">
          N
        </text>
      </svg>
    </div>
  );
}
