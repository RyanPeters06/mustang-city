"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import QRCode from "qrcode";
import { getAccount, getServerAccount, subscribeAccount, syncNow } from "@/lib/account";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";
import { pctFromCells } from "@/lib/fog";
import { rankFor, fogRepFromCells } from "@/lib/rank";
import { demoCells, demoFriends } from "@/lib/demoCrew";
import type { FriendRow } from "@/app/api/friends/route";
import type { EmblemId } from "@/lib/progress";
import Emblem from "../profile/Emblem";

type Lists = { friends: FriendRow[]; incoming: FriendRow[]; outgoing: FriendRow[] };
type Props = {
  prefill: string | null;
  shownFriend: string | null;
  onToggleMap: (friend: FriendRow, cells: string[] | null) => void;
};

const fmtPct = (p: number) => `${p < 10 ? p.toFixed(2) : p.toFixed(1)}%`;

export default function CrewPanel({ prefill, shownFriend, onToggleMap }: Props) {
  const account = useSyncExternalStore(subscribeAccount, getAccount, getServerAccount);
  const me = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const live = account.auth === "signed-in" && account.sync !== "db-unavailable";
  const [lists, setLists] = useState<Lists | null>(null);
  const [input, setInput] = useState(prefill ?? "");
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/friends", { cache: "no-store" });
    if (res.ok) setLists((await res.json()) as Lists);
  }, []);

  useEffect(() => {
    if (!live || !account.handle) return;
    let alive = true;
    fetch("/api/friends", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Lists>) : null))
      .then((j) => alive && j && setLists(j))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [live, account.handle]);

  const shareUrl = account.handle && typeof window !== "undefined" ? `${window.location.origin}/?add=${account.handle}` : null;

  async function toggleQr() {
    if (qr) return setQr(null);
    if (!shareUrl) return;
    setQr(await QRCode.toString(shareUrl, { type: "svg", margin: 1, color: { dark: "#140A2E", light: "#FFFFFF" } }));
  }

  async function add() {
    const handle = input.trim().toLowerCase().replace(/^@/, "");
    if (!handle) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/friends", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ handle }) });
      const json = (await res.json()) as { status?: string; message?: string };
      if (!res.ok) setMsg({ tone: "err", text: json.message ?? "Couldn't add that handle." });
      else {
        setMsg({ tone: "ok", text: json.status === "accepted" ? `You and @${handle} are now crew.` : `Request sent to @${handle}.` });
        setInput("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function act(handle: string, action: "accept" | "decline" | "remove") {
    await fetch("/api/friends", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ handle, action }) });
    if (action === "remove" && shownFriend === handle) onToggleMap({ handle } as FriendRow, null);
    await load();
  }

  async function toggleMap(f: FriendRow, demo: boolean) {
    if (shownFriend === f.handle) return onToggleMap(f, null);
    if (demo) return onToggleMap(f, demoCells(f.handle));
    const res = await fetch(`/api/friends/${f.handle}/cells`, { cache: "no-store" });
    if (res.ok) onToggleMap(f, ((await res.json()) as { cells: string[] }).cells);
  }

  const mine = { rep: me.rep, pct: me.pct, missions: me.missionCount };
  const h = "mb-2 text-[12px] font-bold tracking-[0.16em] text-ink/55 uppercase";
  const field = "min-w-0 flex-1 rounded-xl border border-white/12 bg-white/[0.06] px-3.5 py-3 text-[16px] text-ink outline-none focus:border-pink";

  return (
    <div className="space-y-6 pb-4">
      {live ? (
        <>
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[12px] font-bold tracking-[0.16em] text-ink/55 uppercase">Your handle</p>
            <div className="mt-1 flex items-center gap-3">
              <p className="min-w-0 flex-1 truncate text-[22px] font-bold text-ink">{account.handle ? `@${account.handle}` : "Claiming…"}</p>
              {account.handle && (
                <button type="button" onClick={toggleQr} className="min-h-[40px] rounded-full bg-white/10 px-4 text-[13px] font-bold text-ink">
                  {qr ? "Hide QR" : "QR code"}
                </button>
              )}
            </div>
            {qr && (
              <div className="mt-3 flex flex-col items-center gap-2">
                <div className="w-48 overflow-hidden rounded-2xl bg-white p-2" dangerouslySetInnerHTML={{ __html: qr }} />
                <p className="text-[12px] text-ink/60">Friends scan this to add you</p>
              </div>
            )}
          </section>

          <section>
            <h3 className={h}>Add crew</h3>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void add();
              }}
            >
              <input
                className={field}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="@handle"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <button type="submit" disabled={busy || !input.trim()} className="min-h-[50px] rounded-xl bg-pink px-5 text-[15px] font-bold text-night disabled:opacity-40">
                Add
              </button>
            </form>
            {msg && <p className={`mt-2 text-[13px] ${msg.tone === "ok" ? "text-teal" : "text-pink"}`} role="status">{msg.text}</p>}
          </section>

          {lists && lists.incoming.length > 0 && (
            <section>
              <h3 className={h}>Requests</h3>
              <ul className="space-y-2">
                {lists.incoming.map((f) => (
                  <li key={f.handle} className="flex items-center gap-3 rounded-2xl bg-white/[0.05] p-3">
                    <Emblem id={f.emblem as EmblemId} accent={f.accent} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-ink">{f.name}</p>
                      <p className="truncate text-[12px] text-ink/55">@{f.handle}</p>
                    </div>
                    <button type="button" onClick={() => act(f.handle, "accept")} className="min-h-[40px] rounded-full bg-teal px-4 text-[13px] font-bold text-night">
                      Accept
                    </button>
                    <button type="button" onClick={() => act(f.handle, "decline")} aria-label={`Decline ${f.name}`} className="min-h-[40px] min-w-[40px] rounded-full bg-white/10 text-[15px] text-ink/70">
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className={h}>Crew</h3>
            {!lists ? (
              <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
            ) : lists.friends.length === 0 ? (
              <p className="text-[14px] text-ink/60">
                No crew yet. Share your QR code or add a friend by handle.
                {lists.outgoing.length > 0 && ` Waiting on ${lists.outgoing.map((o) => "@" + o.handle).join(", ")}.`}
              </p>
            ) : (
              <ul className="space-y-3">
                {lists.friends.map((f) => (
                  <FriendCard key={f.handle} f={f} mine={mine} shown={shownFriend === f.handle} onMap={() => toggleMap(f, false)} onRemove={() => act(f.handle, "remove")} />
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <>
          <section className="rounded-3xl border border-pink/30 bg-pink/10 p-4">
            <p className="text-[15px] font-bold text-ink">
              {account.auth === "loading" ? "Checking your account…" : account.auth === "signed-out" ? "Sign in to build your crew" : "Crews aren't switched on yet"}
            </p>
            <p className="mt-1 text-[13px] leading-snug text-ink/70">
              Add Western friends by handle or QR, compare Rep and % explored, and see the parts of Forest State they&apos;ve uncovered.
            </p>
            {account.auth === "signed-out" && (
              <a href="/auth/login" className="mt-3 flex min-h-[48px] items-center justify-center rounded-2xl bg-pink text-[15px] font-bold text-night uppercase">
                Sign in with @uwo.ca
              </a>
            )}
            {account.auth === "signed-in" && account.sync === "db-unavailable" && (
              <button type="button" onClick={() => void syncNow()} className="mt-3 text-[13px] font-semibold text-teal underline">
                Retry
              </button>
            )}
          </section>
          <section>
            <h3 className={h}>Demo crew</h3>
            <p className="-mt-1 mb-2 text-[12px] text-ink/50">Sample players so you can try comparing. Not real accounts.</p>
            <ul className="space-y-3">
              {demoFriends().map((f) => (
                <FriendCard key={f.handle} f={f} mine={mine} shown={shownFriend === f.handle} onMap={() => toggleMap(f, true)} demo />
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function FriendCard({
  f,
  mine,
  shown,
  onMap,
  onRemove,
  demo = false,
}: {
  f: FriendRow;
  mine: { rep: number; pct: number; missions: number };
  shown: boolean;
  onMap: () => void;
  onRemove?: () => void;
  demo?: boolean;
}) {
  // Demo players have a fixed Rep story; real friends' Rep comes from the server.
  const theirRep = demo ? Math.max(f.rep, fogRepFromCells(f.cells)) : f.rep;
  const theirs = { rep: theirRep, pct: pctFromCells(f.cells), missions: f.missions };
  const rows: { label: string; you: number; them: number; fmt: (n: number) => string }[] = [
    { label: "Rep", you: mine.rep, them: theirs.rep, fmt: (n) => n.toLocaleString() },
    { label: "Explored", you: mine.pct, them: theirs.pct, fmt: fmtPct },
    { label: "Missions", you: mine.missions, them: theirs.missions, fmt: (n) => String(n) },
  ];
  return (
    <li className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-3">
        <Emblem id={f.emblem as EmblemId} accent={f.accent} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold text-ink">{f.name}</p>
          <p className="truncate text-[12px] text-ink/55">
            {rankFor(theirs.rep).rank}
            {f.faculty ? ` · ${f.faculty}` : ""}
          </p>
        </div>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-[12px] font-semibold text-ink/40 underline">
            Remove
          </button>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex justify-between text-[11px] font-bold tracking-[0.12em] text-ink/45 uppercase">
          <span>You</span>
          <span>{f.name.split(" ")[0]}</span>
        </div>
        {rows.map((r) => {
          const total = r.you + r.them || 1;
          return (
            <div key={r.label}>
              <div className="flex justify-between text-[13px] tabular-nums">
                <span className={r.you >= r.them ? "font-bold text-ink" : "text-ink/60"}>{r.fmt(r.you)}</span>
                <span className="text-[11px] text-ink/45 uppercase">{r.label}</span>
                <span className={r.them > r.you ? "font-bold text-ink" : "text-ink/60"}>{r.fmt(r.them)}</span>
              </div>
              <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-pink" style={{ width: `${(r.you / total) * 100}%` }} />
                <div className="h-full" style={{ width: `${(r.them / total) * 100}%`, background: f.accent }} />
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onMap}
        className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-2xl text-[14px] font-bold"
        style={shown ? { background: f.accent, color: "#140A2E" } : { background: "rgba(255,255,255,0.07)", color: "#F6EFFF" }}
      >
        {shown ? "Hide their map" : "Show their map"}
      </button>
    </li>
  );
}
