"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { STUDENT_MISSION_REP, missionProblem, type CommunityMission } from "@/lib/communityRules";
import { completeMission, getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";
import { useLastFix } from "@/lib/useLastFix";
import { REVEAL_ACCURACY_M } from "@/lib/location";
import { distanceM } from "@/lib/geo";
import { formatDistance } from "@/lib/missions";

/** Labelled samples shown only when accounts are off, so the section can be demoed. */
const SAMPLES: CommunityMission[] = [
  { id: "s1", slug: "sample-1", title: "Sunset at the Footbridge", briefing: "Best sunset on campus is from the middle of the footbridge. Check in at golden hour.", lngLat: [-81.2787, 43.0072], radiusM: 75, rep: STUDENT_MISSION_REP, score: 14, myVote: 0, author: "demo.maya", mine: false, kind: "sample" },
  { id: "s2", slug: "sample-2", title: "Hidden Bench Behind Weldon", briefing: "There's a quiet bench nobody uses. Find it and claim it for an hour of reading.", lngLat: [-81.2764, 43.0076], radiusM: 75, rep: STUDENT_MISSION_REP, score: 9, myVote: 0, author: "demo.dev", mine: false, kind: "sample" },
];

type Mode = "loading" | "server" | "local";

/** Missions tab → Student jobs: player-written check-in missions, voted up or buried by everyone. */
export default function StudentJobs({ onPassed }: { onPassed: (info: { slug: string; rep: number; reason: string; title?: string }) => void }) {
  const [mode, setMode] = useState<Mode>("loading");
  const [list, setList] = useState<CommunityMission[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const { completions } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const fix = useLastFix(1000);

  useEffect(() => {
    fetch("/api/missions/community")
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const j = (await r.json()) as { missions: CommunityMission[] };
        setList(j.missions);
        setMode("server");
      })
      .catch(() => {
        setList(SAMPLES);
        setMode("local");
      });
  }, []);

  async function vote(m: CommunityMission, v: -1 | 1) {
    const value = m.myVote === v ? 0 : v;
    const patch = (score: number, myVote: -1 | 0 | 1) => setList((l) => l.map((x) => (x.id === m.id ? { ...x, score, myVote } : x)));
    patch(m.score - m.myVote + value, value as -1 | 0 | 1);
    if (m.kind === "sample") return;
    const r = await fetch("/api/missions/community/vote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: m.id, value }) });
    const j = await r.json();
    if (!r.ok) {
      patch(m.score, m.myVote);
      setMsg(j.message ?? "Couldn't vote.");
    } else patch(j.score, j.myVote);
  }

  async function checkIn(m: CommunityMission) {
    if (!fix) return;
    setMsg(null);
    if (m.kind === "server") {
      const r = await fetch("/api/missions/community/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: m.id, lat: fix.lngLat[1], lng: fix.lngLat[0], accuracy: fix.accuracy }),
      });
      const j = await r.json();
      if (!r.ok) return setMsg(j.message ?? "Couldn't check in.");
    }
    if (m.kind === "sample") {
      // Samples demo the moment but never count toward real progress.
      return onPassed({ slug: m.slug, rep: m.rep, reason: "Sample job — not saved", title: m.title });
    }
    completeMission({ slug: m.slug, rep: m.rep, reason: `Student job by @${m.author}` });
    onPassed({ slug: m.slug, rep: m.rep, reason: `Student job by @${m.author}`, title: m.title });
  }

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[12px] font-bold tracking-[0.14em] text-ink/60 uppercase">Student jobs {mode === "local" && <span className="text-gold">· samples</span>}</h3>
        <button type="button" onClick={() => setWriting((w) => !w)} className="min-h-[44px] px-2 text-[14px] font-bold text-teal rounded-full">
          {writing ? "Cancel" : "+ Write a job"}
        </button>
      </div>
      {writing && (
        <Composer
          mode={mode}
          fix={fix}
          onPosted={(m) => {
            setList((l) => [m, ...l]);
            setWriting(false);
          }}
        />
      )}
      {msg && (
        <p role="alert" className="mb-2 border border-pink/40 bg-pink/10 px-3 py-2 text-[14px] text-ink">
          {msg}
        </p>
      )}
      {list.length === 0 && mode === "server" && <p className="text-[14px] text-ink/60">No student jobs yet. Write the first one.</p>}
      <ul className="space-y-2">
        {list.map((m) => {
          const d = fix ? distanceM(fix.lngLat, m.lngLat) : null;
          const done = !!completions[m.slug];
          const inRange = !!fix && fix.accuracy <= REVEAL_ACCURACY_M && d !== null && d <= m.radiusM + Math.min(fix.accuracy, 25);
          return (
            <li key={m.id} className="hud-panel">
              <div className="flex items-stretch">
                <div className="flex w-12 shrink-0 flex-col items-center justify-center border-r border-white/8 py-1">
                  <button type="button" aria-label="Vote up" aria-pressed={m.myVote === 1} onClick={() => vote(m, 1)} className={`h-11 w-11 text-[16px] ${m.myVote === 1 ? "text-teal" : "text-ink/60"}`}>
                    ▲
                  </button>
                  <span className="text-[14px] font-bold text-ink tabular-nums">{m.score}</span>
                  <button type="button" aria-label="Vote down" aria-pressed={m.myVote === -1} onClick={() => vote(m, -1)} className={`h-11 w-11 text-[16px] ${m.myVote === -1 ? "text-pink" : "text-ink/60"}`}>
                    ▼
                  </button>
                </div>
                <button type="button" onClick={() => setOpen(open === m.id ? null : m.id)} className="min-w-0 flex-1 px-3 py-2.5 text-left">
                  <span className="block text-[12px] font-bold tracking-[0.14em] text-orange uppercase">Check-in · +{m.rep} Rep</span>
                  <span className={`block truncate text-[16px] font-bold ${done ? "text-ink/60" : "text-ink"}`}>{m.title}</span>
                  <span className="block text-[12px] text-ink/60">
                    @{m.author} · {done ? "done" : (formatDistance(d) ?? "distance unknown")}
                  </span>
                </button>
              </div>
              {open === m.id && (
                <div className="space-y-2 border-t border-white/8 px-3 py-3">
                  <p className="text-[14px] leading-snug text-ink/85">“{m.briefing}”</p>
                  {done ? (
                    <p className="text-[14px] font-bold text-teal">✓ Job done</p>
                  ) : m.mine ? (
                    <p className="text-[14px] text-ink/60">Your job. Send your friends.</p>
                  ) : (
                    <button
                      type="button"
                      disabled={!inRange}
                      onClick={() => checkIn(m)}
                      className="flex min-h-[48px] w-full items-center justify-center bg-orange text-[14px] font-bold text-night disabled:opacity-40 rounded-full"
                    >
                      {inRange ? "Check in" : d !== null ? `${formatDistance(Math.max(0, d - m.radiusM))} to go` : "Turn on location"}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Composer({ mode, fix, onPosted }: { mode: Mode; fix: { lngLat: [number, number]; accuracy: number } | null; onPosted: (m: CommunityMission) => void }) {
  const [title, setTitle] = useState("");
  const [briefing, setBriefing] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (mode !== "server") {
    return <p className="mb-3 bg-white/[0.05] px-3 py-3 text-[14px] text-ink/70">Writing jobs needs sign-in, so other players can find and vote on them.</p>;
  }

  async function post() {
    const p = missionProblem(title, briefing);
    if (p) return setError(p);
    if (!fix || fix.accuracy > REVEAL_ACCURACY_M) return setError("Stand at the spot with good GPS. The job goes where you are.");
    setBusy(true);
    setError(null);
    const r = await fetch("/api/missions/community", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, briefing, lat: fix.lngLat[1], lng: fix.lngLat[0], accuracy: fix.accuracy }),
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setError(j.message ?? "Couldn't post that job.");
    onPosted(j.mission);
  }

  return (
    <div className="hud-panel mb-3 space-y-2 p-3">
      <p className="text-[12px] text-ink/60">The job is pinned where you&apos;re standing. The Goose screens every job before it goes live.</p>
      <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 50))} placeholder="Job title" className="w-full rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2.5 text-[16px] text-ink placeholder:text-ink/60 focus:border-teal focus:outline-none" />
      <textarea value={briefing} onChange={(e) => setBriefing(e.target.value.slice(0, 140))} rows={3} placeholder="What should they do here?" className="w-full resize-none rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2.5 text-[16px] text-ink placeholder:text-ink/60 focus:border-teal focus:outline-none" />
      {error && <p role="alert" className="text-[14px] text-pink">{error}</p>}
      <button type="button" disabled={busy} onClick={post} className="flex min-h-[48px] w-full items-center justify-center bg-teal text-[14px] font-bold text-night disabled:opacity-50 rounded-full">
        {busy ? "Screening…" : "Post job"}
      </button>
    </div>
  );
}
