"use client";

import TagsSection from "./profile/TagsSection";
import CollectiblesSection from "./profile/CollectiblesSection";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";
import { MISSIONS, missionBySlug } from "@/lib/missions";
import Emblem from "./profile/Emblem";
import ProfileEditor from "./profile/ProfileEditor";
import LoreCard from "./missions/LoreCard";
import Replays from "./profile/Replays";
import MusicToggle from "./profile/MusicToggle";
import StashShelf from "./profile/StashShelf";
import { walkStats, WEEKLY_ACTIVE_GOAL_MIN } from "@/lib/walkStats";
import BadgeGrid from "./profile/BadgeGrid";
import RegionsBoard from "./districts/RegionsBoard";
import { badgeByCode } from "@/lib/badges";

type User = { name?: string; email?: string; picture?: string };
type Account = { kind: "loading" } | { kind: "signed-in"; user: User } | { kind: "signed-out" } | { kind: "unavailable" };

export default function ProfilePanel({
  denied,
  onOpenMission,
  onOpenTag,
  onOpenWrapped,
  onOpenCollectible,
  onOpenSchedule,
  onPlayReplay,
}: {
  denied: boolean;
  onOpenMission: (slug: string) => void;
  onOpenTag: (id: string) => void;
  onOpenWrapped: () => void;
  onOpenCollectible: (id: string) => void;
  onOpenSchedule: () => void;
  onPlayReplay: () => void;
}) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [account, setAccount] = useState<Account>({ kind: "loading" });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/auth/profile", { cache: "no-store" })
      .then(async (res) => {
        if (!alive) return;
        if (res.ok && res.status !== 204) setAccount({ kind: "signed-in", user: await res.json() });
        else if (res.status === 401 || res.status === 204) setAccount({ kind: "signed-out" });
        else setAccount({ kind: "unavailable" });
      })
      .catch(() => alive && setAccount({ kind: "unavailable" }));
    return () => {
      alive = false;
    };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const walk = useMemo(() => walkStats(), [snap.pct, snap.rep]);

  if (editing)
    return (
      <ProfileEditor
        snap={snap}
        onClose={() => {
          setEditing(false);
          requestAnimationFrame(() => document.querySelector("[role=dialog] .overflow-y-auto")?.scrollTo({ top: 0 }));
        }}
      />
    );

  const { profile, completions, rep, rank, nextRank, pct, missionCount } = snap;
  const fallbackName = account.kind === "signed-in" ? (account.user.name ?? account.user.email?.split("@")[0]) : undefined;
  const name = profile.name || fallbackName || "Set your name";
  const done = Object.values(completions).sort((a, b) => b.at - a.at);
  const showcase = profile.showcase.map((s) => completions[s]).filter((c) => c?.thumb);
  const archive = MISSIONS.filter((m) => m.category && completions[m.slug]);
  const prevMin = nextRank ? [0, 1000, 5000, 15000].filter((n) => n < nextRank.min).pop()! : 15000;
  const toNext = nextRank ? Math.min(1, (rep - prevMin) / (nextRank.min - prevMin)) : 1;

  const cta = "flex min-h-[52px] w-full items-center justify-center rounded-full text-[16px] font-bold";
  const h = "mb-2 text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase";

  return (
    <div className="space-y-6 pb-4">
      {denied && (
        <p className="rounded-2xl border border-pink/40 bg-pink/10 px-4 py-3 text-[14px] text-ink">
          Only <b>@uwo.ca</b> accounts can sign in to Mustang City.
        </p>
      )}

      {/* Identity card */}
      <section
        className="relative overflow-hidden rounded-3xl border border-white/10 p-4"
        style={{ background: `linear-gradient(140deg, ${profile.accent}33, rgba(20,10,46,0.6) 60%)` }}
      >
        <div className="flex items-center gap-4">
          <Emblem id={profile.emblem} accent={profile.accent} size={64} />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[20px] leading-tight font-bold break-words text-ink">{name}</p>
            {profile.title && badgeByCode(profile.title) && (
              <p className="text-[12px] font-bold tracking-[0.14em] uppercase" style={{ color: badgeByCode(profile.title)!.color }}>
                {badgeByCode(profile.title)!.name}
              </p>
            )}
            <p className="mt-0.5 line-clamp-2 text-[14px] leading-snug text-ink/60">
              {[profile.faculty || "No faculty yet", profile.year].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit profile"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-ink"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-[12px] font-bold tracking-[0.14em] uppercase">
            <span className="text-gold">{rank}</span>
            <span className="text-ink/60">{nextRank ? `${(nextRank.min - rep).toLocaleString()} Rep to ${nextRank.name}` : "Max rank"}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-pink to-gold" style={{ width: `${toNext * 100}%` }} />
          </div>
        </div>
        {!profile.faculty && (
          <p className="mt-3 text-[12px] text-ink/60">Pick your faculty so your Rep counts in the turf war.</p>
        )}
      </section>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-2.5">
        <Stat value={rep.toLocaleString()} label="Rep" color="text-orange" />
        <Stat value={`${pct < 10 ? pct.toFixed(2) : pct.toFixed(1)}%`} label="Explored" color="text-teal" />
        <Stat value={`${missionCount}/${MISSIONS.length}`} label="Missions" color="text-pink" />
      </section>

      {/* Health (Sun Life health track): from real recorded walks only, measured against the WHO weekly activity goal */}
      <section className="rounded-2xl bg-white/[0.04] px-4 py-3" aria-labelledby="health-title">
        <div className="flex items-baseline justify-between">
          <h3 id="health-title" className="text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">Health</h3>
          <span className="text-[12px] text-ink/60">
            {walk.streakDays > 1 ? `${walk.streakDays}-day walking streak` : walk.walksWeek ? `${walk.walksWeek} walk${walk.walksWeek === 1 ? "" : "s"} this week` : "Real walks only"}
          </span>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline justify-between">
            <p className="text-[20px] font-bold text-teal tabular-nums">
              {walk.activeMinWeek}
              <span className="ml-1 text-[12px] font-semibold text-ink/60">/ {WEEKLY_ACTIVE_GOAL_MIN} active min</span>
            </p>
            <p className="text-[12px] text-ink/60">
              {walk.activeMinWeek >= WEEKLY_ACTIVE_GOAL_MIN ? "Weekly goal hit" : `${WEEKLY_ACTIVE_GOAL_MIN - walk.activeMinWeek} min to go`}
            </p>
          </div>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Active minutes this week"
            aria-valuemin={0}
            aria-valuemax={WEEKLY_ACTIVE_GOAL_MIN}
            aria-valuenow={Math.min(walk.activeMinWeek, WEEKLY_ACTIVE_GOAL_MIN)}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal to-gold transition-[width] duration-700 motion-reduce:transition-none"
              style={{ width: `${Math.min(100, (walk.activeMinWeek / WEEKLY_ACTIVE_GOAL_MIN) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-ink/50">WHO recommends 150+ minutes of moderate activity a week.</p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[20px] font-bold text-teal tabular-nums">
              {walk.kmWeek.toFixed(1)}
              <span className="ml-0.5 text-[12px] font-semibold">km</span>
            </p>
            <p className="text-[12px] text-ink/60">this week</p>
          </div>
          <div>
            <p className="text-[20px] font-bold text-pink tabular-nums">≈{walk.stepsWeek.toLocaleString()}</p>
            <p className="text-[12px] text-ink/60">steps</p>
          </div>
          <div>
            <p className="text-[20px] font-bold text-gold tabular-nums">{walk.newPlacesWeek}</p>
            <p className="text-[12px] text-ink/60">new places</p>
          </div>
        </div>
        <p className="mt-2 text-center text-[12px] text-ink/50">{walk.kmTotal.toFixed(1)} km walked all time</p>
      </section>

      {showcase.length > 0 && (
        <section>
          <h3 className={h}>Showcase</h3>
          <div className="grid grid-cols-3 gap-2">
            {showcase.map((c) => (
              <button key={c!.slug} type="button" onClick={() => onOpenMission(c!.slug)} className="aspect-square overflow-hidden rounded-2xl ring-2 ring-gold/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c!.thumb} alt={missionBySlug(c!.slug)?.title ?? ""} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className={h}>Missions passed</h3>
        {done.length === 0 ? (
          <p className="text-[14px] text-ink/60">Nothing yet. The Goose is waiting — check the Missions tab.</p>
        ) : (
          <ul className="space-y-2">
            {done.map((c) => {
              const m = missionBySlug(c.slug);
              if (!m) return null;
              return (
                <li key={c.slug}>
                  <button type="button" onClick={() => onOpenMission(c.slug)} className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.04] p-2.5 text-left">
                    {c.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.thumb} alt="" className="h-12 w-12 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange/20 text-[20px] text-orange">✓</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-semibold text-ink">{m.title}</span>
                      <span className="block text-[12px] text-ink/60">{new Date(c.at).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</span>
                    </span>
                    <span className="text-[14px] font-bold text-orange">+{c.rep}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={onOpenWrapped}
        className="hud-panel flex min-h-[64px] w-full items-center justify-between px-4 py-3 text-left"
      >
        <span>
          <span className="block text-[12px] font-bold tracking-[0.3em] text-teal uppercase">Your year so far</span>
          <span className="font-display block text-[26px] leading-none text-ink uppercase">Forest State Wrapped</span>
        </span>
        <span className="text-[22px] text-pink" aria-hidden>▶</span>
      </button>

      <button type="button" onClick={onOpenSchedule} className="hud-panel flex min-h-[60px] w-full items-center justify-between px-4 py-3 text-left">
        <span>
          <span className="block text-[12px] font-bold tracking-[0.3em] text-teal uppercase">Class Run · {Object.keys(snap.classRuns).length} on time</span>
          <span className="block text-[16px] font-bold text-ink">Add your schedule, get waypoints to class</span>
        </span>
        <span className="text-[20px] text-teal" aria-hidden>›</span>
      </button>

      <BadgeGrid snap={snap} />

      <RegionsBoard snap={snap} mode="all" />

      <CollectiblesSection snap={snap} onOpen={onOpenCollectible} />

      <Replays onPlay={onPlayReplay} />
      <StashShelf snap={snap} />
      <MusicToggle />

      <TagsSection onOpen={onOpenTag} />

      {archive.length > 0 && (
        <section>
          <h3 className={h}>Mustang City Archive</h3>
          <div className="space-y-2.5">
            {archive.map((m) => (
              <LoreCard key={m.slug} m={m} />
            ))}
          </div>
        </section>
      )}

      {/* Account */}
      <section>
        <h3 className={h}>Account</h3>
        {account.kind === "loading" && <div className="h-14 animate-pulse rounded-2xl bg-white/5" />}
        {account.kind === "signed-in" && (
          <div className="space-y-2.5">
            <p className="text-[14px] text-ink/70">Signed in as {account.user.email}</p>
            <a href="/auth/logout" className={`${cta} bg-white/10 text-ink`}>
              Sign out
            </a>
          </div>
        )}
        {account.kind === "signed-out" && (
          <div className="space-y-2.5">
            <p className="text-[14px] text-ink/70">Sign in with your Western account to save progress across devices and appear on leaderboards.</p>
            <a href="/auth/login" className={`${cta} bg-pink text-night shadow-[0_10px_40px_-8px_rgba(255,79,139,0.9)]`}>
              Sign in with @uwo.ca
            </a>
          </div>
        )}
        {account.kind === "unavailable" && (
          <p className="text-[14px] text-ink/60">Sign-in isn&apos;t switched on for this deployment yet. Your progress is saved on this device.</p>
        )}
      </section>

      <p className="pb-2 text-[12px] leading-relaxed text-ink/60">
        Data: City of London Open Data (planning districts) · London Transit Commission open data (routes, buses) ·{" "}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="underline">
          Weather by Open-Meteo.com
        </a>{" "}
        (CC BY 4.0) · Map © Mapbox © OpenStreetMap.
      </p>
    </div>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.05] px-3 py-3 text-center">
      <p className={`text-[20px] font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[12px] font-semibold tracking-[0.14em] text-ink/60 uppercase">{label}</p>
    </div>
  );
}
