"use client";

import { useSyncExternalStore } from "react";
import { getBuses, getServerBuses, subscribeBuses } from "@/lib/buses";

/** Bus status, shown only when the feed is delayed (offline = no buses drawn; simulated is dev-only). */
export default function TransitChip() {
  const b = useSyncExternalStore(subscribeBuses, getBuses, getServerBuses);
  if (b.status !== "delayed") return null;
  return (
    <div
      className="glass pointer-events-none absolute right-4 z-20 flex min-h-[28px] items-center gap-1.5 rounded-full px-3 text-[11px] font-medium text-ink/75"
      style={{ top: "calc(var(--safe-top) + 182px)" }}
      role="status"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
      Buses delayed · {Math.max(1, Math.round((b.ageSec ?? 60) / 60))} min old
    </div>
  );
}
