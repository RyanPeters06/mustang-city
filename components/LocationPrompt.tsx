"use client";

import { useState, useSyncExternalStore } from "react";
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
  const [explain, setExplain] = useState(false);

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

  // Permission explainer (IDEAS §5): say why and what's stored before iOS shows its own prompt.
  if (status === "idle" && explain)
    return (
      <div className="absolute inset-x-4 z-20" style={{ bottom: "calc(var(--safe-bottom) + 104px)" }}>
        <div className="glass-solid rounded-[22px] p-4" role="dialog" aria-label="Why location">
          <p className="text-[16px] font-bold text-ink">Your walks clear the fog</p>
          <ul className="mt-2 space-y-1 text-[13px] leading-snug text-ink/75">
            <li>• Only the cleared map is kept, on this phone (and your account if you sign in).</li>
            <li>• Never shared live. Friends see where you&apos;ve been, never where you are.</li>
            <li>• Check-ins and quests use it to confirm you&apos;re really there.</li>
          </ul>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setExplain(false)} className="min-h-[44px] flex-1 rounded-full bg-white/10 text-[14px] font-bold text-ink">
              Not now
            </button>
            <button type="button" onClick={startWatching} className="min-h-[44px] flex-1 rounded-full bg-teal text-[14px] font-bold text-night">
              Turn on location
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="absolute inset-x-0 z-20 flex justify-center px-4" style={{ bottom: "calc(var(--safe-bottom) + 112px)" }}>
      <div className="glass flex items-center gap-3 rounded-full py-1.5 pr-1.5 pl-4" role="status">
        <span className={`h-2 w-2 shrink-0 rounded-full ${tone}`} />
        <p className="py-1.5 text-[14px] text-ink/85">{text}</p>
        {action ? (
          <button type="button" onClick={() => setExplain(true)} className="min-h-[44px] rounded-full bg-teal px-4 text-[14px] font-bold text-night">
            {action}
          </button>
        ) : (
          <span className="w-2" />
        )}
      </div>
    </div>
  );
}
