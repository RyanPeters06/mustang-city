"use client";

import { useSyncExternalStore } from "react";

const sub = (l: () => void) => {
  window.addEventListener("online", l);
  window.addEventListener("offline", l);
  return () => {
    window.removeEventListener("online", l);
    window.removeEventListener("offline", l);
  };
};

/** Offline banner (IDEAS §5): the game keeps working on-device; say so instead of failing silently. */
export default function OfflineChip() {
  const online = useSyncExternalStore(sub, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div className="ui-chrome pointer-events-none absolute left-1/2 z-30 -translate-x-1/2" style={{ top: "calc(var(--safe-top) + 64px)" }} role="status">
      <p className="glass rounded-full px-4 py-2 text-[13px] font-semibold text-ink/85">Offline · progress still saves on this phone</p>
    </div>
  );
}
