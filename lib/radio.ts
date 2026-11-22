"use client";
/**
 * Forest FM: tap-to-start radio (never autoplays). When on, entering a new neighbourhood queues a
 * ~15-second segment from /api/radio. Gemini TTS audio when the server has it; otherwise the phone's
 * built-in speech voice reads the script. Captions always show (accessibility + silent phones).
 */
import { onFix, getLastFix } from "./location";
import { districtAt } from "./districts";
import { CAMPUS_CENTER, type LngLat } from "./geo";
import { getSnapshot as getProgress, subscribe as subscribeProgress } from "./progress";
import { DISTRICTS } from "./districts";

export type RadioState = {
  on: boolean;
  status: "off" | "tuning" | "playing" | "idle";
  district: string | null; // neighbourhood being tuned / played
  script: string | null;
  scriptDistrict: string | null; // neighbourhood the shown script is about
  source: "gemini" | "template" | null;
};

const OFF: RadioState = { on: false, status: "off", district: null, script: null, scriptDistrict: null, source: null };
let state: RadioState = OFF;
const listeners = new Set<() => void>();
let unsubFix: (() => void) | null = null;
let audio: HTMLAudioElement | null = null;
let lastDistrict: string | null = null;
let lastCheck = 0;
let queue: string | null = null;
let unsubNews: (() => void) | null = null;

const set = (p: Partial<RadioState>) => {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
};
export const getRadio = () => state;
export const getServerRadio = () => OFF;
export function subscribeRadio(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Short original station ident: three rising sine tones. */
function ident() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [523.25, 659.25, 987.77].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.55);
    });
    setTimeout(() => void ctx.close(), 1200);
  } catch {
    /* no Web Audio: skip the ident */
  }
}

function stopVoice() {
  audio?.pause();
  audio = null;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

function speakLocally(text: string, done: () => void) {
  if (!("speechSynthesis" in window)) return setTimeout(done, 15_000);
  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  u.voice = voices.find((v) => v.lang === "en-CA") ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
  u.rate = 1.04;
  u.pitch = 0.95;
  u.onend = done;
  u.onerror = done;
  window.speechSynthesis.speak(u);
}

async function playSegment(district: string) {
  if (!state.on) return;
  if (state.status === "tuning" || state.status === "playing") {
    queue = district; // play after the current segment
    return;
  }
  set({ status: "tuning", district });
  try {
    const res = await fetch(`/api/radio?district=${encodeURIComponent(district)}`);
    if (!res.ok) throw new Error(String(res.status));
    const seg = (await res.json()) as { script: string; audio: { data: string; mime: string } | null; source: "gemini" | "template" };
    if (!state.on) return;
    set({ status: "playing", script: seg.script, scriptDistrict: district, source: seg.source });
    const started = performance.now();
    const finish = () => {
      // Keep captions readable even when a phone has no speech voice (speech "ends" instantly).
      const wait = 6000 - (performance.now() - started);
      if (wait > 0) return void setTimeout(finish, wait);
      if (!state.on) return;
      set({ status: "idle" });
      const next = queue;
      queue = null;
      if (next && next !== district) void playSegment(next);
    };
    if (seg.audio) {
      audio = new Audio(`data:${seg.audio.mime};base64,${seg.audio.data}`);
      audio.onended = finish;
      audio.play().catch(() => speakLocally(seg.script, finish));
    } else speakLocally(seg.script, finish);
  } catch {
    set({ status: "playing", script: "Static on the line. Forest FM will be back when you have signal." });
    setTimeout(() => state.status === "playing" && set({ status: "idle" }), 4000);
  }
}

const here = (): LngLat => getLastFix()?.lngLat ?? CAMPUS_CENTER;

/**
 * Radio news interruption (IDEAS §1): a short "breaking news" bulletin that cuts in over the current segment,
 * e.g. when you claim a region. Phone speech voice + caption (fast, no network round trip).
 */
export function radioBulletin(text: string) {
  if (!state.on) return;
  stopVoice();
  ident();
  set({ status: "playing", script: `Breaking: ${text}`, scriptDistrict: null, source: "template" });
  setTimeout(() => {
    speakLocally(`Breaking news on Forest FM. ${text}`, () => {
      if (!state.on) return;
      setTimeout(() => state.on && set({ status: "idle" }), 3000);
    });
  }, 600);
}

function watchNews() {
  let claimed = new Set(Object.keys(getProgress().districts));
  const unsub = subscribeProgress(() => {
    const now = Object.keys(getProgress().districts);
    const fresh = now.find((r) => !claimed.has(r));
    claimed = new Set(now);
    if (!fresh) return;
    const who = getProgress().profile.name || "A Western student";
    radioBulletin(`${who} just claimed ${fresh}. That's ${now.length} of ${DISTRICTS.length} regions in Forest State.`);
  });
  return () => {
    unsub();
  };
}

/** Must be called from a tap (autoplay rules). */
export function radioOn() {
  if (state.on) return;
  set({ on: true, status: "idle", script: null });
  ident();
  unsubNews = watchNews();
  lastDistrict = districtAt(here());
  setTimeout(() => void playSegment(lastDistrict ?? "Central London"), 700);
  unsubFix = onFix((fix) => {
    const now = performance.now();
    if (now - lastCheck < 1000) return;
    lastCheck = now;
    const d = districtAt(fix.lngLat);
    if (!d || d === lastDistrict) return;
    lastDistrict = d;
    void playSegment(d);
  });
}

export function radioOff() {
  unsubFix?.();
  unsubFix = null;
  unsubNews?.();
  unsubNews = null;
  queue = null;
  stopVoice();
  state = OFF;
  listeners.forEach((l) => l());
}

/** Demo: play the segment for a named neighbourhood now. */
export function radioPlay(district: string) {
  if (!state.on) radioOn();
  lastDistrict = district;
  stopVoice();
  set({ status: "idle" });
  void playSegment(district);
}
