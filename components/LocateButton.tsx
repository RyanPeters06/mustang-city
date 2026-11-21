"use client";

import { getLastFix, startWatching } from "@/lib/location";
import type { MapHandle } from "./map/MapView";

/** Recenter on the player; starts location if it isn't running yet. */
export default function LocateButton({ map }: { map: React.RefObject<MapHandle | null> }) {
  return (
    <button
      type="button"
      aria-label="Show my location"
      onClick={() => {
        const fix = getLastFix();
        if (fix) map.current?.locate(fix.lngLat);
        else startWatching();
      }}
      className="glass absolute right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full text-teal active:scale-95"
      style={{ bottom: "calc(var(--safe-bottom) + 168px)" }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
        <path d="M12 2 20 21 12 16.5 4 21 12 2Z" />
      </svg>
    </button>
  );
}
