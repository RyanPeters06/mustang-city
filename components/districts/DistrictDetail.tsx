"use client";

import { useState, useSyncExternalStore } from "react";
import { DISTRICTS, districtAt, getDistrictStats, subscribeDistricts } from "@/lib/districts";
import { MISSIONS, CATEGORY_LABEL, TYPE_LABEL } from "@/lib/missions";
import { COLLECTIBLES } from "@/lib/collectibles";
import { checkInQuest, getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";
import { getServerTurf, getTurf, subscribeTurf } from "@/lib/turf";
import { facultyColor, facultyShort } from "@/lib/faculty";
import { CLAIM_NEEDED, REGION_REP, checkInRadius, checkInTarget, questPlaces, regionProgress, type Quest } from "@/lib/regions";
import { useLastFix } from "@/lib/useLastFix";
import { acceptFix } from "@/lib/location";
import { distanceM, type LngLat } from "@/lib/geo";
import { getServerDemo, isDemoOn, subscribeDemo } from "@/lib/demo";

const noStats = () => [];

const fmtDist = (m: number) => (m < 950 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);

// Simple line glyphs for each quest kind (24×24, stroked).
const GLYPH: Record<Quest["kind"], string> = {
  visit: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Zm0-8.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  explore: "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15",
  checkin: "M5 8h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z M16 9h2a2 2 0 0 1 0 4h-2 M8 3v2 M11 3v2",
  mission: "M12 3l2.6 5.4 5.9.9-4.3 4.1 1 5.9L12 16.6 6.8 19.3l1-5.9L3.5 9.3l5.9-.9z",
  collectible: "M12 3l7 4v10l-7 4-7-4V7z M12 3v18 M5 7l7 4 7-4",
};

/** Region card: shown when a neighbourhood is tapped. Its quest board is how the region gets claimed. */
export default function DistrictDetail({ name, onOpenMission }: { name: string; onOpenMission: (slug: string) => void }) {
  const stats = useSyncExternalStore(subscribeDistricts, getDistrictStats, noStats);
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const demo = useSyncExternalStore(subscribeDemo, isDemoOn, getServerDemo);
  const turf = useSyncExternalStore(subscribeTurf, getTurf, getServerTurf);
  const fix = useLastFix(1000);
  const [note, setNote] = useState<string | null>(null);

  const d = DISTRICTS.find((x) => x.name === name);
  const stat = stats.find((s) => s.name === name);
  const claimed = !!snap.districts[name];
  const prog = regionProgress(name, { visits: snap.visits, checkins: snap.checkins, completions: snap.completions, finds: snap.finds }, stats);
  const missions = MISSIONS.filter((m) => m.type !== "heist" && prog.quests.every((q) => q.kind !== "mission" || q.slug !== m.slug) && districtAt(m.lngLat) === name);
  const holder = turf.rows.find((r) => r.district === name);
  const from = fix?.lngLat ?? null;

  function teleport(p: LngLat) {
    acceptFix(p, { accuracy: 5, source: "demo" });
    setTimeout(() => acceptFix([p[0] + 0.00002, p[1]], { accuracy: 5, source: "demo" }), 900);
  }

  function checkIn(q: Extract<Quest, { kind: "checkin" }>) {
    if (!from) return setNote("Turn on location to check in.");
    const placed = checkInQuest(name, q.id, from);
    setNote(placed ? `Checked in at ${placed}.` : "You're not at one of these places yet. Get within a few metres and try again.");
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Claim status */}
      <div className="hud-panel p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">{claimed ? "Region claimed" : "Claim this region"}</span>
          <span className="text-[14px] font-bold text-orange">+{REGION_REP} Rep</span>
        </div>
        <p className="mt-1 text-[22px] font-bold text-ink tabular-nums">
          {Math.min(prog.count, 4)}/4 <span className="text-[14px] font-semibold text-ink/60">quests · {CLAIM_NEEDED} to claim</span>
        </p>
        <div className="mt-2 flex gap-1.5" aria-hidden>
          {prog.done.map((ok, i) => (
            <span key={i} className={`h-2 flex-1 rounded-full ${ok ? (claimed ? "bg-gold" : "bg-gradient-to-r from-pink to-orange") : "bg-white/10"}`} />
          ))}
        </div>
        <p className="mt-2 text-[13px] text-ink/65">
          {claimed ? "The fog over this whole region has lifted. It counts toward your regions and your faculty's turf." : "Finish quests here to lift the fog over the whole region at once."}
        </p>
      </div>

      {note && (
        <p role="status" className="rounded-2xl bg-teal/10 px-4 py-2.5 text-[14px] text-teal">
          {note}
        </p>
      )}

      {/* Quest board */}
      <ol className="space-y-2">
        {prog.quests.map((q, i) => {
          const ok = prog.done[i];
          return (
            <li key={q.id} className={`hud-panel px-3.5 py-3 ${ok ? "opacity-80" : ""}`}>
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${ok ? "bg-teal/20 text-teal" : "bg-white/[0.07] text-gold"}`} aria-hidden>
                  {ok ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={GLYPH[q.kind]} /></svg>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-[15px] leading-snug font-semibold ${ok ? "text-ink/70 line-through decoration-teal/60" : "text-ink"}`}>{q.title}</p>
                  {!ok && <p className="mt-0.5 text-[13px] leading-snug text-ink/60">{q.detail}</p>}
                  {!ok && <QuestAction q={q} region={name} from={from} have={stat?.have ?? 0} demo={demo} onCheckIn={checkIn} onTeleport={teleport} onOpenMission={onOpenMission} />}
                  {ok && q.kind === "checkin" && snap.checkins[q.id] && <p className="mt-0.5 text-[12px] text-ink/50">at {snap.checkins[q.id].place}</p>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Faculty turf */}
      <div className="hud-panel flex items-center gap-3 px-4 py-3">
        <span className="h-8 w-8 shrink-0 rounded-lg" style={{ background: holder ? facultyColor(holder.faculty) : "rgba(255,255,255,0.08)" }} aria-hidden />
        <span className="min-w-0 text-[14px] leading-snug">
          <span className="block text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">Faculty turf{turf.status === "sample" ? " · sample" : ""}</span>
          {holder ? (
            <span className="block font-bold text-ink">
              Held by {facultyShort(holder.faculty)}
              {turf.status === "live" && <span className="font-normal text-ink/60"> · {Math.round(holder.share * 100)}% of cleared ground</span>}
            </span>
          ) : (
            <span className="block text-ink/70">{turf.status === "unavailable" ? "Turf appears once accounts are switched on." : "Unclaimed. Your faculty could take it."}</span>
          )}
        </span>
      </div>

      {missions.length > 0 && (
        <section>
          <h3 className="mb-2 text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">More Goose jobs here · {missions.length}</h3>
          <ul className="space-y-2">
            {missions.map((m) => (
              <li key={m.slug}>
                <button type="button" onClick={() => onOpenMission(m.slug)} className="hud-panel flex min-h-[52px] w-full items-center justify-between gap-3 px-3 py-2.5 text-left">
                  <span className="min-w-0">
                    <span className="block truncate text-[16px] font-semibold text-ink">{m.title}</span>
                    <span className="block text-[12px] text-ink/60">{m.category ? CATEGORY_LABEL[m.category] : TYPE_LABEL[m.type]}</span>
                  </span>
                  <span className={`text-[14px] font-bold ${snap.completions[m.slug] ? "text-teal" : "text-orange"}`}>{snap.completions[m.slug] ? "✓" : `+${m.rep}`}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d?.info?.startsWith("http") && (
        <a href={d.info} target="_blank" rel="noreferrer" className="inline-block min-h-[44px] pt-2 text-[14px] font-semibold text-teal underline">
          City of London district profile
        </a>
      )}
    </div>
  );
}

const actionBtn = "min-h-[40px] rounded-full px-4 text-[13px] font-bold";

function QuestAction({
  q,
  region,
  from,
  have,
  demo,
  onCheckIn,
  onTeleport,
  onOpenMission,
}: {
  q: Quest;
  region: string;
  from: LngLat | null;
  have: number;
  demo: boolean;
  onCheckIn: (q: Extract<Quest, { kind: "checkin" }>) => void;
  onTeleport: (p: LngLat) => void;
  onOpenMission: (slug: string) => void;
}) {
  const go = (p: LngLat) =>
    demo && (
      <button type="button" onClick={() => onTeleport(p)} className={`${actionBtn} bg-white/[0.08] text-ink/80`}>
        Go there (demo)
      </button>
    );

  if (q.kind === "visit") {
    const c = DISTRICTS.find((d) => d.name === region)?.label;
    return <div className="mt-2 flex flex-wrap gap-2">{c && go(c)}</div>;
  }

  if (q.kind === "explore") {
    const pct = Math.min(1, have / q.cells);
    return (
      <div className="mt-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-teal to-gold" style={{ width: `${pct * 100}%` }} />
        </div>
        <p className="mt-1 text-[12px] text-ink/55 tabular-nums">
          {Math.floor(have / 7)}/{Math.round(q.cells / 7)} blocks
        </p>
      </div>
    );
  }

  if (q.kind === "checkin") {
    const places = questPlaces(q, region, from).slice(0, 3);
    const here = from ? checkInTarget(q, region, from) : null;
    return (
      <div className="mt-2 space-y-2">
        <ul className="space-y-1">
          {places.map((p) => (
            <li key={p.n + p.p.join()} className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate text-ink/80">{p.n}</span>
              <span className="shrink-0 text-ink/50 tabular-nums">{p.m != null ? fmtDist(p.m) : ""}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onCheckIn(q)}
            className={`${actionBtn} ${here ? "btn-sunset" : "bg-white/[0.08] text-ink/60"}`}
          >
            {here ? `Check in at ${here.n}` : `Check in (within ${checkInRadius(q.cats[0])} m)`}
          </button>
          {places[0] && go(places[0].p)}
        </div>
      </div>
    );
  }

  if (q.kind === "mission") {
    const m = MISSIONS.find((x) => x.slug === q.slug);
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => onOpenMission(q.slug)} className={`${actionBtn} btn-sunset`}>
          Open the job
        </button>
        {m && go(m.lngLat)}
      </div>
    );
  }

  const c = COLLECTIBLES.find((x) => x.id === q.collectible);
  const dist = c && from ? distanceM(from, c.lngLat) : null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {dist != null && <span className="text-[12px] text-ink/60">{dist < 400 ? "Very close. Look around." : dist < 1500 ? "Getting warm." : "Head into the area to start the search."}</span>}
      {c && go(c.lngLat)}
    </div>
  );
}
