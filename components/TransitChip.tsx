"use client";

import { useSyncExternalStore } from "react";
import { getBuses, getServerBuses, subscribeBuses } from "@/lib/buses";

/** Honest status for the bus layer: live, delayed (last good feed), simulated (dev only) or offline. */
export default function TransitChip() {
  const b = useSyncExternalStore(subscribeBuses, getBuses, getServerBuses);
  if (b.status === "loading") return null;
  const label =
    b.status === "live"
      ? `Live buses · ${b.count}`
      : b.status === "delayed"
        ? `Buses delayed · ${Math.max(1, Math.round((b.ageSec ?? 60) / 60))} min old`
        : b.status === "simulated"
          ? "Simulated buses (dev)"
          : "Live buses offline";
  const dot = b.status === "live" ? "bg-teal" : b.status === "unavailable" ? "bg-ink/30" : "bg-gold";
  return (
    <div
      className="glass pointer-events-none absolute right-4 z-20 flex min-h-[32px] items-center gap-2 px-3 text-[10px] font-bold tracking-[0.16em] text-ink/75 uppercase"
      style={{ bottom: "calc(var(--safe-bottom) + 288px)", clipPath: "polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px)" }}
      role="status"
    >
      <span className={`h-2 w-2 rounded-full ${dot} ${b.status === "live" ? "animate-pulse" : ""}`} aria-hidden />
      {label}
    </div>
  );
}
