"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { HEIST_CREW, HEIST_WINDOW_MS, type HeistStatus } from "@/lib/heistRules";
import { getHeistSim, getServerHeistSim, subscribeHeistSim } from "@/lib/heistDemo";
import type { Mission } from "@/lib/missions";

type Props = { m: Mission; fix: { lngLat: [number, number]; accuracy: number } | null; inRange: boolean; onComplete: () => void };

/** Heist: 3+ players check in at the spot within 15 minutes. Polls the crew while a heist is open. */
export default function HeistPanel({ m, fix, inRange, onComplete }: Props) {
  const sim = useSyncExternalStore(subscribeHeistSim, getHeistSim, getServerHeistSim);
  const [status, setStatus] = useState<HeistStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [offline, setOffline] = useState(false);
  const done = useRef(false);

  const apply = useCallback(
    (s: HeistStatus) => {
      setStatus(s);
      if (s.state === "complete" && s.joined && !done.current) {
        done.current = true;
        onComplete();
      }
    },
    [onComplete],
  );

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setNow(Date.now());
      try {
        const res = await fetch(`/api/heists?slug=${m.slug}`);
        if (res.status === 401 || res.status === 503) return alive && setOffline(true);
        if (res.ok && alive) apply((await res.json()) as HeistStatus);
      } catch {
        /* offline: keep last state */
      }
    };
    void load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [m.slug, apply]);

  async function join() {
    setError(null);
    if (offline && sim) {
      // Demo crew: two more players "arrive" a few seconds apart.
      const start = Date.now();
      apply({ state: "open", members: 1, needed: HEIST_CREW, expiresAt: start + HEIST_WINDOW_MS, joined: true });
      setTimeout(() => apply({ state: "open", members: 2, needed: HEIST_CREW, expiresAt: start + HEIST_WINDOW_MS, joined: true }), 2500);
      setTimeout(() => apply({ state: "complete", members: 3, needed: HEIST_CREW, expiresAt: start + HEIST_WINDOW_MS, joined: true }), 5000);
      return;
    }
    if (!fix) return;
    const res = await fetch("/api/heists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: m.slug, lat: fix.lngLat[1], lng: fix.lngLat[0], accuracy: fix.accuracy }),
    });
    const j = await res.json();
    if (!res.ok) return setError(j.message ?? "Couldn't join. Try again.");
    apply(j as HeistStatus);
  }

  const members = status?.members ?? 0;
  const open = status?.state === "open";
  const left = open && status?.expiresAt ? Math.max(0, Math.round((status.expiresAt - now) / 60_000)) : null;

  return (
    <div className="space-y-3">
      <div className="hud-panel px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-[0.2em] text-purple uppercase">
            Crew {offline && sim ? "· demo" : ""}
          </span>
          {left !== null && <span className="text-[12px] text-ink/60">{left} min left</span>}
        </div>
        <div className="mt-2 flex gap-2" aria-label={`${members} of ${HEIST_CREW} crew in`}>
          {Array.from({ length: HEIST_CREW }, (_, i) => (
            <span key={i} className={`h-10 flex-1 border ${i < members ? "border-purple bg-purple/40" : "border-white/15 bg-white/[0.03]"}`}>
              <span className="flex h-full items-center justify-center text-[16px]">{i < members ? "✓" : ""}</span>
            </span>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-ink/60">
          {status?.state === "complete"
            ? "Crew assembled. Job done."
            : open
              ? `${members}/${HEIST_CREW} in. Get your crew here in the next ${left} min.`
              : `Needs ${HEIST_CREW} players at the spot within 15 minutes. Start it and call your crew.`}
        </p>
      </div>
      {error && (
        <p role="alert" className="border border-pink/40 bg-pink/10 px-4 py-3 text-[14px] text-ink">
          {error}
        </p>
      )}
      {offline && !sim ? (
        <p className="bg-white/[0.05] px-4 py-3 text-center text-[14px] text-ink/70">Heists need sign-in so the crew can find each other.</p>
      ) : status?.joined && status.state !== "expired" ? null : (
        <button
          type="button"
          disabled={!(offline && sim) && !inRange}
          onClick={join}
          className="flex min-h-[52px] w-full items-center justify-center bg-purple text-[16px] font-bold text-ink disabled:opacity-50 rounded-full"
        >
          {open ? "Join the heist" : "Start the heist"}
        </button>
      )}
    </div>
  );
}
