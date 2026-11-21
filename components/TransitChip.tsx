"use client";

import { useSyncExternalStore } from "react";
import { getBuses, getServerBuses, subscribeBuses } from "@/lib/buses";

/** Bus layer status, shown only when the feed isn't live: delayed (last good), simulated (dev) or offline. */
export default function TransitChip() {
  const b = useSyncExternalStore(subscribeBuses, getBuses, getServerBuses);
  if (b.status === "loading" || b.status === "live") return null;
  const label =
    b.status === "delayed"
      ? `Buses delayed · ${Math.max(1, Math.round((b.ageSec ?? 60) / 60))} min old`
      : b.status === "simulated"
        ? "Simulated buses (dev)"
        : "Live buses offline";
  return (
    <div
      className="glass pointer-events-none absolute right-4 z-20 flex min-h-[26px] max-w-[160px] items-center gap-1.5 px-2 text-[9px] font-bold tracking-[0.12em] text-ink/75 uppercase"
      style={{ top: "calc(var(--safe-top) + 182px)", clipPath: "polygon(6px 0, 100% 0, 100% 100%, 0 100%, 0 6px)" }}
      role="status"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${b.status === "unavailable" ? "bg-ink/30" : "bg-gold"}`} aria-hidden />
      {label}
    </div>
  );
}
