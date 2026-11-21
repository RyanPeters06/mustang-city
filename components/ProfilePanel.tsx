"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";
import { MISSIONS, missionBySlug } from "@/lib/missions";
import Emblem from "./profile/Emblem";
import ProfileEditor from "./profile/ProfileEditor";
import LoreCard from "./missions/LoreCard";
import Replays from "./profile/Replays";
import BadgeGrid from "./profile/BadgeGrid";
import Neighbourhoods from "./profile/Neighbourhoods";
import { badgeByCode } from "@/lib/badges";

type User = { name?: string; email?: string; picture?: string };
type Account = { kind: "loading" } | { kind: "signed-in"; user: User } | { kind: "signed-out" } | { kind: "unavailable" };

export default function ProfilePanel({
  denied,
  onOpenMission,
  onPlayReplay,
}: {
  denied: boolean;
  onOpenMission: (slug: string) => void;
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
  const name = profile.name || fallbackName || "Unnamed Mustang";
  const done = Object.values(completions).sort((a, b) => b.at - a.at);
  const showcase = profile.showcase.map((s) => completions[s]).filter((c) => c?.thumb);
  const archive = MISSIONS.filter((m) => m.category && completions[m.slug]);
  const prevMin = nextRank ? [0, 1000, 5000, 15000].filter((n) => n < nextRank.min).pop()! : 15000;
  const toNext = nextRank ? Math.min(1, (rep - prevMin) / (nextRank.min - prevMin)) : 1;

  const cta = "flex min-h-[52px] w-full items-center justify-center rounded-2xl text-[16px] font-bold uppercase tracking-wide";
  const h = "mb-2 text-[12px] font-bold tracking-[0.16em] text-ink/55 uppercase";

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
            <p className="line-clamp-2 text-[19px] leading-tight font-bold break-words text-ink">{name}</p>
            {profile.title && badgeByCode(profile.title) && (
              <p className="text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: badgeByCode(profile.title)!.color }}>
                {badgeByCode(profile.title)!.name}
              </p>
            )}
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-ink/60">
              {[profile.faculty || "No faculty yet", profile.year].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="min-h-[40px] rounded-full bg-white/10 px-4 text-[13px] font-bold text-ink"
          >
            Edit
          </button>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-[12px] font-bold tracking-[0.12em] uppercase">
            <span className="text-gold">{rank}</span>
            <span className="text-ink/50">{nextRank ? `${(nextRank.min - rep).toLocaleString()} Rep to ${nextRank.name}` : "Max rank"}</span>
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
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange/20 text-[18px] text-orange">✓</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink">{m.title}</span>
                      <span className="block text-[12px] text-ink/50">{new Date(c.at).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</span>
                    </span>
                    <span className="text-[13px] font-bold text-orange">+{c.rep}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <BadgeGrid snap={snap} />

      <Neighbourhoods snap={snap} />

      <Replays onPlay={onPlayReplay} />

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
    </div>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.05] px-3 py-3 text-center">
      <p className={`text-[20px] font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] font-semibold tracking-[0.15em] text-ink/55 uppercase">{label}</p>
    </div>
  );
}
