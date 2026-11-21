"use client";

import { useEffect, useState } from "react";

type User = { name?: string; email?: string; picture?: string };
type State =
  | { kind: "loading" }
  | { kind: "signed-in"; user: User }
  | { kind: "signed-out" }
  | { kind: "unavailable" };

export default function ProfilePanel({ denied }: { denied: boolean }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    fetch("/auth/profile", { cache: "no-store" })
      .then(async (res) => {
        if (!alive) return;
        if (res.ok && res.status !== 204) setState({ kind: "signed-in", user: await res.json() });
        else if (res.status === 401 || res.status === 204) setState({ kind: "signed-out" });
        else setState({ kind: "unavailable" });
      })
      .catch(() => alive && setState({ kind: "unavailable" }));
    return () => {
      alive = false;
    };
  }, []);

  const cta = "flex min-h-[52px] w-full items-center justify-center rounded-2xl text-[16px] font-bold uppercase tracking-wide";

  return (
    <div className="space-y-4 pb-4">
      {denied && (
        <p className="rounded-2xl border border-pink/40 bg-pink/10 px-4 py-3 text-[14px] text-ink">
          Only <b>@uwo.ca</b> accounts can sign in to Mustang City.
        </p>
      )}

      {state.kind === "loading" && <div className="h-24 animate-pulse rounded-2xl bg-white/5" />}

      {state.kind === "signed-in" && (
        <>
          <div className="flex items-center gap-4">
            {state.user.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={state.user.picture} alt="" className="h-14 w-14 rounded-full ring-2 ring-pink" />
            ) : (
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-pink to-orange" />
            )}
            <div className="min-w-0">
              <p className="truncate text-[18px] font-bold text-ink">{state.user.name ?? "Mustang"}</p>
              <p className="truncate text-[14px] text-ink/60">{state.user.email}</p>
            </div>
          </div>
          <a href="/auth/logout" className={`${cta} bg-white/10 text-ink`}>
            Sign out
          </a>
        </>
      )}

      {state.kind === "signed-out" && (
        <>
          <p className="text-[15px] leading-snug text-ink/80">
            Sign in with your Western account to save your map, earn Rep and join your faculty&apos;s turf war.
          </p>
          <a href="/auth/login" className={`${cta} bg-pink text-night shadow-[0_10px_40px_-8px_rgba(255,79,139,0.9)]`}>
            Sign in with @uwo.ca
          </a>
        </>
      )}

      {state.kind === "unavailable" && (
        <p className="text-[15px] text-ink/70">Sign-in isn&apos;t available on this deployment yet. Your fog map is saved on this device.</p>
      )}
    </div>
  );
}
