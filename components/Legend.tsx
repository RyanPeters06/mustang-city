"use client";

import { useEffect, useState } from "react";
import type { LayerGroup, MapHandle } from "./map/MapView";

const KEY = "mc.legend.v1";
type Prefs = Record<LayerGroup, boolean>;
const DEFAULTS: Prefs = { buses: true, tags: true, collectibles: true, landmarks: true };

const BLIPS: { color: string; label: string; shape?: "ring" | "diamond" | "square" }[] = [
  { color: "#ff4f8b", label: "Photo mission" },
  { color: "#ff8a3d", label: "Check-in mission" },
  { color: "#7b2ff7", label: "Heist (crew of 3)" },
  { color: "#ffc857", label: "Landmark (sourced history)" },
  { color: "#ffc857", label: "Hidden landmark area", shape: "ring" },
  { color: "#ffc857", label: "Collectible you found", shape: "diamond" },
  { color: "#2ee6d6", label: "LTC bus (route colour)", shape: "square" },
  { color: "#f6efff", label: "Tag left by a player", shape: "square" },
];

const TOGGLES: { group: LayerGroup; label: string }[] = [
  { group: "landmarks", label: "Hidden landmark areas" },
  { group: "collectibles", label: "Collectibles" },
  { group: "buses", label: "Buses + routes" },
  { group: "tags", label: "Player tags" },
];

/** Map legend (brief §Map): what every blip means + toggles for the optional layers. Prefs stay on this phone. */
export default function Legend({ map }: { map: React.RefObject<MapHandle | null> }) {
  const [open, setOpen] = useState(false);
  // Only rendered once the map is ready (client-side), so reading storage in the initializer is safe.
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try {
      return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Prefs>) };
    } catch {
      return DEFAULTS;
    }
  });

  useEffect(() => {
    for (const g of Object.keys(prefs) as LayerGroup[]) map.current?.setGroupVisible(g, prefs[g]);
  }, [map, prefs]);

  const toggle = (g: LayerGroup) => {
    const next = { ...prefs, [g]: !prefs[g] };
    setPrefs(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Map legend"
        className="rise-in glass absolute right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full text-ink/80 active:scale-95"
        style={{ animationDelay: "60ms", bottom: "calc(var(--safe-bottom) + 348px)" }}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      </button>
      {open && (
        <div
          className="glass-solid absolute right-[76px] z-30 w-[236px] animate-[fadein_200ms_ease-out] rounded-[22px] p-4"
          style={{ bottom: "calc(var(--safe-bottom) + 168px)" }}
          role="dialog"
          aria-label="Map legend"
        >
          <p className="text-[14px] font-semibold text-ink">On the map</p>
          <ul className="mt-2 space-y-1.5">
            {BLIPS.map((b) => (
              <li key={b.label} className="flex items-center gap-2.5 text-[12px] text-ink/75">
                <span
                  className={`inline-block h-3 w-3 shrink-0 ${b.shape === "ring" ? "rounded-full border-2 border-dashed" : b.shape === "diamond" ? "rotate-45 rounded-[2px]" : b.shape === "square" ? "rounded-[3px]" : "rounded-full"}`}
                  style={b.shape === "ring" ? { borderColor: b.color } : { background: b.color }}
                  aria-hidden
                />
                {b.label}
              </li>
            ))}
            <li className="flex items-center gap-2.5 text-[12px] text-ink/75">
              <span className="inline-block h-[3px] w-3 shrink-0 rounded-full bg-[#ffd58a] shadow-[0_0_6px_#ff6f91]" aria-hidden />
              Mustang City border (always explored)
            </li>
          </ul>
          <p className="mt-4 text-[14px] font-semibold text-ink">Show</p>
          <div className="mt-2 space-y-1">
            {TOGGLES.map((t) => (
              <label key={t.group} className="flex min-h-[44px] items-center justify-between gap-2 text-[14px] text-ink/85">
                {t.label}
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs[t.group]}
                  onClick={() => toggle(t.group)}
                  className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${prefs[t.group] ? "bg-teal" : "bg-white/15"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink shadow transition-all ${prefs[t.group] ? "left-[18px]" : "left-0.5"}`} />
                </button>
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
