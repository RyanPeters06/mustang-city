"use client";
/**
 * Account state (Auth0 session as seen by the browser) + background sync of device progress.
 * Loaded once per app session; Profile and Crew read it from here.
 */
import { getCells, subscribe as subscribeFog } from "./fog";
import { getSnapshot as getProgress, subscribe as subscribeProgress } from "./progress";

export type User = { name?: string; email?: string; picture?: string };
export type AccountState = {
  auth: "loading" | "signed-in" | "signed-out" | "unavailable";
  user: User | null;
  handle: string | null;
  sync: "idle" | "syncing" | "ok" | "db-unavailable" | "error";
};

let state: AccountState = { auth: "loading", user: null, handle: null, sync: "idle" };
const listeners = new Set<() => void>();
let started = false;

function set(patch: Partial<AccountState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const getAccount = () => state;
const SERVER: AccountState = { auth: "loading", user: null, handle: null, sync: "idle" };
export const getServerAccount = () => SERVER;

export function subscribeAccount(l: () => void) {
  start();
  listeners.add(l);
  return () => listeners.delete(l);
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  fetch("/auth/profile", { cache: "no-store" })
    .then(async (res) => {
      if (res.ok && res.status !== 204) {
        set({ auth: "signed-in", user: (await res.json()) as User });
        void syncNow();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const schedule = () => {
          clearTimeout(timer);
          timer = setTimeout(() => void syncNow(), 15_000);
        };
        subscribeFog(schedule);
        subscribeProgress(schedule);
      } else if (res.status === 401 || res.status === 204) set({ auth: "signed-out" });
      else set({ auth: "unavailable" });
    })
    .catch(() => set({ auth: "unavailable" }));
}

/** Push profile, revealed cells and completions to the account. */
export async function syncNow() {
  if (state.auth !== "signed-in" || state.sync === "db-unavailable") return;
  set({ sync: "syncing" });
  const { profile, completions } = getProgress();
  try {
    const res = await fetch("/api/me", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        profile: { name: profile.name, faculty: profile.faculty, year: profile.year, emblem: profile.emblem, accent: profile.accent },
        cells: getCells(),
        completions: Object.keys(completions),
      }),
    });
    if (res.status === 503) return set({ sync: "db-unavailable" });
    if (!res.ok) return set({ sync: "error" });
    const json = (await res.json()) as { handle: string };
    set({ sync: "ok", handle: json.handle });
  } catch {
    set({ sync: "error" });
  }
}
