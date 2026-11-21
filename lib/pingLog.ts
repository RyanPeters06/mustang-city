"use client";
/**
 * Buffers real GPS fixes and sends them to /api/pings in batches while signed in.
 * Stops quietly for the session when accounts/DB aren't available (503/401).
 */
import { onFix } from "./location";
import { getAccount, subscribeAccount } from "./account";

const FLUSH_MS = 30_000;
const FLUSH_AT = 25;
const MAX_BUFFER = 2000;

type Ping = { ts: number; lat: number; lng: number; acc: number };
let buffer: Ping[] = [];
let started = false;
let disabled = false;
let timer: ReturnType<typeof setInterval> | undefined;
let inflight = false;

async function flush() {
  if (disabled || inflight || !buffer.length) return;
  const { auth, sync } = getAccount();
  if (auth !== "signed-in" || sync === "db-unavailable") return;
  inflight = true;
  const batch = buffer.slice(0, 500);
  try {
    const res = await fetch("/api/pings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pings: batch }),
      keepalive: true,
    });
    if (res.ok) buffer = buffer.slice(batch.length);
    else if (res.status === 503 || res.status === 401) {
      disabled = true; // accounts off or signed out: keep the device-only replay, stop trying
      buffer = [];
    }
    // 409 (profile not synced yet) or 5xx: keep the buffer and retry next tick
  } catch {
    /* offline — retry next tick */
  } finally {
    inflight = false;
  }
}

export function startPingLog() {
  if (started || typeof window === "undefined") return;
  started = true;
  subscribeAccount(() => {});
  onFix((fix) => {
    if (fix.source !== "gps" || disabled || getAccount().auth === "signed-out" || getAccount().auth === "unavailable") return;
    buffer.push({ ts: fix.ts, lat: fix.lngLat[1], lng: fix.lngLat[0], acc: fix.accuracy });
    if (buffer.length > MAX_BUFFER) buffer = buffer.slice(-MAX_BUFFER);
    if (buffer.length >= FLUSH_AT) void flush();
  });
  timer = setInterval(() => void flush(), FLUSH_MS);
  window.addEventListener("pagehide", () => void flush());
}

export const _pingLogTimer = () => timer; // for tests/debugging
