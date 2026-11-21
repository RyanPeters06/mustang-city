"use client";

import { useSyncExternalStore } from "react";
import {
  REVEAL_ACCURACY_M,
  getLocationState,
  getServerLocationState,
  startWatching,
  subscribeLocationState,
} from "@/lib/location";

/** One pill that always says what location is doing; hidden once GPS is good enough to clear fog. */
export default function LocationPrompt() {
  const { status, accuracy } = useSyncExternalStore(subscribeLocationState, getLocationState, getServerLocationState);

  let text: string;
  let action: string | null = null;
  let tone = "bg-teal";

  if (status === "idle") {
    text = "Turn on location to clear the fog";
    action = "Enable";
  } else if (status === "locating") {
    text = "Finding you…";
    tone = "bg-gold animate-pulse";
  } else if (status === "denied") {
    text = "Location is blocked. Allow it in Settings → Privacy → Location.";
    tone = "bg-pink";
  } else if (status === "unavailable") {
    text = "This device can't share its location.";
    tone = "bg-pink";
  } else if (accuracy !== null && accuracy > REVEAL_ACCURACY_M) {
    text = `Weak GPS (±${accuracy} m). Step outside to clear fog.`;
    tone = "bg-gold";
  } else {
    return null; // tracking well — the map speaks for itself
  }

  return (
    <div className="absolute inset-x-0 z-20 flex justify-center px-4" style={{ bottom: "calc(var(--safe-bottom) + 112px)" }}>
      <div className="glass flex items-center gap-3 rounded-full py-1.5 pr-1.5 pl-4" role="status">
        <span className={`h-2 w-2 shrink-0 rounded-full ${tone}`} />
        <p className="py-1.5 text-[13px] text-ink/85">{text}</p>
        {action ? (
          <button type="button" onClick={startWatching} className="min-h-[36px] rounded-full bg-teal px-4 text-[13px] font-bold text-night">
            {action}
          </button>
        ) : (
          <span className="w-2" />
        )}
      </div>
    </div>
  );
}
