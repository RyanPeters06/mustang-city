"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { CATEGORY_LABEL, TYPE_LABEL, formatDistance, missionBySlug, missionDistance } from "@/lib/missions";
import { completeMission, getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";
import { REVEAL_ACCURACY_M, startWatching } from "@/lib/location";
import { useLastFix } from "@/lib/useLastFix";
import { preparePhoto } from "@/lib/photo";
import { TYPE_COLOR } from "./MissionList";
import LoreCard from "./LoreCard";
import GoosePortrait from "./GoosePortrait";
import NextBus from "./NextBus";
import HeistPanel from "./HeistPanel";
import { getRides, getServerRides, subscribeRides } from "@/lib/rides";
import { useBriefing } from "@/lib/useBriefing";

export type PassedInfo = { slug: string; rep: number; thumb?: string; reason: string };

type Props = {
  slug: string;
  waypoint: { slug: string; distanceM: number; minutes: number } | null;
  onWaypoint: (slug: string | null) => void;
  onPassed: (info: PassedInfo) => void;
};

type Phase = { kind: "idle" } | { kind: "working"; label: string; preview?: string } | { kind: "error"; message: string };

export default function MissionDetail({ slug, waypoint, onWaypoint, onPassed }: Props) {
  const m = missionBySlug(slug)!;
  const { completions } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const done = completions[slug];
  const fix = useLastFix(800);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);
  const briefing = useBriefing(slug, m.briefing);
  const { rides } = useSyncExternalStore(subscribeRides, getRides, getServerRides);
  const rodeRecently = Object.values(rides).some((ts) => ts.some((t) => Date.now() - t < 45 * 60_000));

  const distance = missionDistance(m, fix?.lngLat ?? null);
  const accurate = !!fix && fix.accuracy <= REVEAL_ACCURACY_M;
  const inRange = accurate && distance !== null && distance <= m.radiusM + Math.min(fix!.accuracy, 25);
  const kind = m.category ? "landmark" : m.type;
  const routed = waypoint?.slug === slug;

  async function submit(image?: string, thumb?: string) {
    if (!fix) return;
    setPhase({ kind: "working", label: image ? "The Goose is checking your photo…" : "Checking in…", preview: thumb });
    try {
      const res = await fetch("/api/missions/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, lat: fix.lngLat[1], lng: fix.lngLat[0], accuracy: fix.accuracy, image }),
      });
      const json = (await res.json()) as { pass?: boolean; reason?: string; rep?: number; message?: string };
      if (!res.ok) return setPhase({ kind: "error", message: json.message ?? "Something went wrong. Try again." });
      if (!json.pass) return setPhase({ kind: "error", message: `Not quite: ${json.reason ?? "try another angle."}` });
      completeMission({ slug, rep: m.rep, thumb, reason: json.reason });
      setPhase({ kind: "idle" });
      if (routed) onWaypoint(null);
      onPassed({ slug, rep: m.rep, thumb, reason: json.reason ?? "" });
    } catch {
      setPhase({ kind: "error", message: "No connection. Your photo is still here — try again." });
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setPhase({ kind: "working", label: "Developing photo…" });
      const { image, thumb } = await preparePhoto(file);
      await submit(image, thumb);
    } catch {
      setPhase({ kind: "error", message: "Couldn't read that photo. Try taking it again." });
    }
  }

  const primary = "flex min-h-[52px] w-full items-center justify-center rounded-2xl text-[16px] font-bold uppercase tracking-wide";

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2 text-[12px] font-bold tracking-[0.14em] uppercase">
        <span className={TYPE_COLOR[kind]}>{m.category ? CATEGORY_LABEL[m.category] : TYPE_LABEL[m.type]}</span>
        <span className="text-ink/30">·</span>
        <span className="text-orange">+{m.rep} Rep</span>
        {distance !== null && !done && (
          <>
            <span className="text-ink/30">·</span>
            <span className="text-ink/60">{formatDistance(distance)}</span>
          </>
        )}
      </div>

      {/* The Goose's briefing */}
      <figure className="flex items-start gap-3 rounded-2xl bg-white/[0.05] p-3">
        <GoosePortrait size={60} className="shrink-0 rounded-2xl ring-1 ring-pink/50" />
        <blockquote className="min-w-0 pt-0.5">
          <p className="text-[11px] font-bold tracking-[0.16em] text-pink uppercase">The Goose</p>
          <p key={briefing} className="mt-1 animate-[fadein_300ms_ease-out] text-[15px] leading-snug text-ink/90">
            “{briefing}”
          </p>
        </blockquote>
      </figure>

      {done ? (
        <>
          <div className="flex items-center gap-3 rounded-2xl border border-teal/30 bg-teal/10 p-3">
            {done.thumb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={done.thumb} alt="Your mission photo" className="h-16 w-16 rounded-xl object-cover" />
            )}
            <div>
              <p className="text-[14px] font-bold text-teal">Mission passed</p>
              {done.reason && <p className="text-[13px] text-ink/70">{done.reason}</p>}
            </div>
          </div>
          <LoreCard m={m} />
        </>
      ) : (
        <>
          <p className="text-[13px] text-ink/60">
            <span className="font-semibold text-ink/80">Objective:</span>{" "}
            {m.type === "photo" ? m.criteria : m.type === "bus" ? "Arrive by bus." : m.type === "heist" ? "Get a crew of 3 inside the circle within 15 minutes." : "Get inside the circle and check in."}
          </p>

          <NextBus at={m.lngLat} />

          {phase.kind === "working" && (
            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.05] p-3">
              {phase.preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={phase.preview} alt="" className="h-14 w-14 rounded-xl object-cover" />
              )}
              <p className="animate-pulse text-[14px] text-ink/80">{phase.label}</p>
            </div>
          )}
          {phase.kind === "error" && (
            <p className="rounded-2xl border border-pink/40 bg-pink/10 px-4 py-3 text-[14px] text-ink" role="alert">
              {phase.message}
            </p>
          )}

          <div className="grid gap-2.5">
            {m.type === "heist" ? (
              <HeistPanel
                m={m}
                fix={fix && accurate ? { lngLat: fix.lngLat, accuracy: fix.accuracy } : null}
                inRange={inRange}
                onComplete={() => {
                  completeMission({ slug, rep: m.rep, reason: "Heist crew complete." });
                  onPassed({ slug, rep: m.rep, reason: "Heist crew complete." });
                }}
              />
            ) : !fix ? (
              <button type="button" onClick={startWatching} className={`${primary} bg-teal text-night`}>
                Turn on location
              </button>
            ) : !accurate ? (
              <p className="rounded-2xl bg-gold/10 px-4 py-3 text-center text-[14px] text-gold">
                GPS too rough (±{Math.round(fix.accuracy)} m). Step outside.
              </p>
            ) : !inRange ? (
              <p className="rounded-2xl bg-white/[0.05] px-4 py-3 text-center text-[14px] text-ink/70">
                {formatDistance(Math.max(0, (distance ?? 0) - m.radiusM))} to go. Get inside the circle.
              </p>
            ) : m.type === "photo" ? (
              <button
                type="button"
                disabled={phase.kind === "working"}
                onClick={() => fileRef.current?.click()}
                className={`${primary} bg-pink text-night shadow-[0_10px_40px_-8px_rgba(255,79,139,0.9)] disabled:opacity-50`}
              >
                {phase.kind === "error" ? "Retake photo" : "Take photo"}
              </button>
            ) : m.type === "bus" && !rodeRecently ? (
              <p className="rounded-2xl bg-white/[0.05] px-4 py-3 text-center text-[14px] text-ink/70">
                Arrive by bus: ride any LTC route here and it unlocks.
              </p>
            ) : (
              <button
                type="button"
                disabled={phase.kind === "working"}
                onClick={() => submit()}
                className={`${primary} bg-orange text-night disabled:opacity-50`}
              >
                Check in
              </button>
            )}

            <button
              type="button"
              onClick={() => onWaypoint(routed ? null : slug)}
              className={`${primary} border border-white/12 bg-white/[0.06] text-ink`}
            >
              {routed ? `Clear waypoint · ${formatDistance(waypoint!.distanceM)} · ${waypoint!.minutes} min` : "Set waypoint"}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
        </>
      )}
    </div>
  );
}
