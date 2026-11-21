"use client";
/**
 * Class Run (docs/roadmap.md): the student's class schedule, kept ONLY on this device (private, one-tap delete).
 * Next-class card ~25 min before start; arriving inside the building radius before start (and staying 2 min)
 * earns +20 Rep once per class meeting. Never penalises missed classes.
 */
import { CAMPUS_BUILDINGS, distanceM, type LngLat } from "./geo";
import { getLastFix, onFix } from "./location";

export type Meeting = { id: string; course: string; building: string; room: string; days: number[]; start: string; end: string };
export type ClassState = { meetings: Meeting[]; runs: Record<string, number> }; // runs: `${meetingId}|${yyyy-mm-dd}` → at

const KEY = "mc.schedule.v1";
export const CLASS_RUN_REP = 20;
export const CLASS_RADIUS_M = 70;
const EARLY_MIN = 25;
const DWELL_MS = 2 * 60_000;

let state: ClassState = { meetings: [], runs: {} };
let loaded = false;
const SERVER: ClassState = { meetings: [], runs: {} };
const listeners = new Set<() => void>();
const runListeners = new Set<(m: Meeting, key: string) => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as ClassState | null;
    if (s?.meetings) state = { meetings: s.meetings, runs: s.runs ?? {} };
  } catch {
    /* start empty */
  }
}
function save(next: ClassState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export const getSchedule = () => (load(), state);
export const getServerSchedule = () => SERVER;
export function subscribeSchedule(l: () => void) {
  load();
  listeners.add(l);
  return () => listeners.delete(l);
}
export function onClassRun(l: (m: Meeting, key: string) => void) {
  runListeners.add(l);
  return () => runListeners.delete(l);
}

export const addMeetings = (ms: Omit<Meeting, "id">[]) =>
  save({ ...getSchedule(), meetings: [...getSchedule().meetings, ...ms.map((m, i) => ({ ...m, id: `${Date.now().toString(36)}${i}` }))] });
export const removeMeeting = (id: string) => save({ ...getSchedule(), meetings: getSchedule().meetings.filter((m) => m.id !== id) });
/** One-tap delete: schedule and its check-ins history go; earned Rep stays (it's in progress). */
export const clearSchedule = () => save({ meetings: [], runs: {} });

// ---- Building matching ---------------------------------------------------------------
/** Common Western building codes → names in campusBuildings.json (best effort; unmatched rows ask the student). */
const CODES: Record<string, string> = {
  MC: "Middlesex College", UC: "University College", UCC: "University Community Centre", SSC: "Social Science Centre",
  AHB: "Arts & Humanities", TC: "Talbot College", NCB: "North Campus Building", FNB: "FIMS & Nursing Building",
  HSB: "Health Sciences Building", MSB: "Medical Sciences Building", SEB: "Spencer Engineering Building",
  TEB: "Thompson Engineering Building", NS: "Natural Sciences Building", NSC: "Natural Sciences Building",
  BGS: "Biological & Geological Sciences", WSC: "Western Science Centre", CHB: "Chemistry Building",
  SH: "Stevenson Hall", WL: "Weldon Library", TH: "Thames Hall", WIRB: "Western Interdisciplinary Research Building",
  ACEB: "Amit Chakma Engineering Building", IVEY: "Richard Ivey Building", LAW: "Law School", PAB: "Physics Building",
};
const norm = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

export function matchBuilding(text: string): string | null {
  if (!text) return null;
  const code = text.trim().split(/[\s-]/)[0].toUpperCase();
  if (CODES[code]) return CODES[code];
  const t = norm(text);
  const byName = CAMPUS_BUILDINGS.filter((b) => !b.residence).find((b) => t.includes(norm(b.name)) || norm(b.name).includes(t));
  return byName?.name ?? null;
}
export const buildingAt = (name: string): LngLat | null => {
  const b = CAMPUS_BUILDINGS.find((x) => x.name === name);
  return b ? [b.lng, b.lat] : null;
};

// ---- Next class --------------------------------------------------------------------------
const at = (d: Date, hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const x = new Date(d);
  x.setHours(h, m, 0, 0);
  return x;
};
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** The next meeting starting within `windowMin` (or started < 10 min ago). */
export function nextClass(now = new Date(), windowMin = EARLY_MIN): { meeting: Meeting; startsAt: Date; done: boolean } | null {
  let best: { meeting: Meeting; startsAt: Date; done: boolean } | null = null;
  for (const m of getSchedule().meetings) {
    if (!m.days.includes(now.getDay())) continue;
    const s = at(now, m.start);
    const mins = (s.getTime() - now.getTime()) / 60_000;
    if (mins > windowMin || mins < -10) continue;
    if (!best || s < best.startsAt) best = { meeting: m, startsAt: s, done: !!getSchedule().runs[`${m.id}|${dayKey(now)}`] };
  }
  return best;
}

// ---- Arrival detection ---------------------------------------------------------------------
let watching = false;
export function startClassRunWatch() {
  if (watching || typeof window === "undefined") return;
  watching = true;
  const firstInside = new Map<string, number>();
  const check = (lngLat: LngLat, accuracy: number, ts: number) => {
    if (accuracy > 50) return;
    const now = new Date(ts);
    const n = nextClass(now, EARLY_MIN);
    if (!n || n.done || now > n.startsAt) return; // only before start counts as on time
    const where = buildingAt(n.meeting.building);
    if (!where) return;
    const key = `${n.meeting.id}|${dayKey(now)}`;
    if (distanceM(lngLat, where) > CLASS_RADIUS_M + Math.min(accuracy, 25)) {
      firstInside.delete(key);
      return;
    }
    const since = firstInside.get(key) ?? ts;
    firstInside.set(key, since);
    if (ts - since < DWELL_MS) return; // no drive-by farming
    save({ ...getSchedule(), runs: { ...getSchedule().runs, [key]: ts } });
    runListeners.forEach((l) => l(n.meeting, key));
  };
  onFix((fix) => {
    if (fix.source !== "replay") check(fix.lngLat, fix.accuracy, fix.ts);
  });
  // Standing still in a lecture hall produces no new fixes, so re-check the last one on a timer.
  setInterval(() => {
    const f = getLastFix();
    if (f && f.source !== "replay" && Date.now() - f.ts < 10 * 60_000) check(f.lngLat, f.accuracy, Date.now());
  }, 20_000);
}

/** On-time arrivals in the current Mon–Sun week (Perfect Attendance). */
export function onTimeThisWeek(runs: Record<string, number>, now = Date.now()) {
  const d = new Date(now);
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).getTime();
  return Object.values(runs).filter((t) => t >= monday).length;
}

// ---- .ics import (parsed on the device; nothing uploaded) ------------------------------------
const DAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
export function parseIcs(text: string): Omit<Meeting, "id">[] {
  const lines = text.replace(/\r\n[ \t]/g, "").split(/\r?\n/);
  const out: Omit<Meeting, "id">[] = [];
  let ev: Record<string, string> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") ev = {};
    else if (line === "END:VEVENT" && ev) {
      const start = ev.DTSTART?.match(/T(\d{2})(\d{2})/);
      const end = ev.DTEND?.match(/T(\d{2})(\d{2})/);
      const date = ev.DTSTART?.match(/(\d{4})(\d{2})(\d{2})/);
      const byday = ev.RRULE?.match(/BYDAY=([A-Z,]+)/)?.[1];
      const days = byday ? byday.split(",").map((d) => DAY[d]).filter((d) => d !== undefined) : date ? [new Date(+date[1], +date[2] - 1, +date[3]).getDay()] : [];
      if (start && days.length) {
        const loc = (ev.LOCATION ?? "").replace(/\\,/g, ",");
        out.push({
          course: (ev.SUMMARY ?? "Class").replace(/\\,/g, ",").slice(0, 40),
          building: matchBuilding(loc) ?? "",
          room: loc.slice(0, 40),
          days: [...new Set(days)].sort(),
          start: `${start[1]}:${start[2]}`,
          end: end ? `${end[1]}:${end[2]}` : "",
        });
      }
      ev = null;
    } else if (ev) {
      const i = line.indexOf(":");
      if (i > 0) ev[line.slice(0, i).split(";")[0]] = line.slice(i + 1);
    }
  }
  // Same course+time+building repeated (one VEVENT per week) → one meeting with merged days.
  const merged = new Map<string, Omit<Meeting, "id">>();
  for (const m of out) {
    const k = `${m.course}|${m.start}|${m.building}`;
    const prev = merged.get(k);
    merged.set(k, prev ? { ...prev, days: [...new Set([...prev.days, ...m.days])].sort() } : m);
  }
  return [...merged.values()];
}
