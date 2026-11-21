"use client";

import { useSyncExternalStore } from "react";
import { getLocationStatus, getServerLocationStatus, startWatching, subscribeLocationStatus } from "@/lib/location";

const COPY = {
  idle: { text: "Turn on location to clear the fog", action: "Enable" },
  denied: { text: "Location is off. Allow it in Settings → Safari to clear fog.", action: null },
  unavailable: { text: "Can't get your location right now.", action: "Retry" },
} as const;

export default function LocationPrompt() {
  const status = useSyncExternalStore(subscribeLocationStatus, getLocationStatus, getServerLocationStatus);
  if (status === "watching") return null;
  const copy = COPY[status];

  return (
    <div className="absolute inset-x-0 z-20 flex justify-center px-4" style={{ bottom: "calc(var(--safe-bottom) + 112px)" }}>
      <div className="glass flex items-center gap-3 rounded-full py-1.5 pr-1.5 pl-4">
        <span className="h-2 w-2 shrink-0 rounded-full bg-teal shadow-[0_0_10px_#2ee6d6]" />
        <p className="text-[13px] text-ink/85">{copy.text}</p>
        {copy.action && (
          <button
            type="button"
            onClick={startWatching}
            className="min-h-[36px] rounded-full bg-teal px-4 text-[13px] font-bold text-night"
          >
            {copy.action}
          </button>
        )}
      </div>
    </div>
  );
}
