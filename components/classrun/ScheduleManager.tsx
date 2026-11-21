"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { CAMPUS_BUILDINGS } from "@/lib/geo";
import {
  CLASS_RUN_REP,
  addMeetings,
  clearSchedule,
  getSchedule,
  getServerSchedule,
  matchBuilding,
  parseIcs,
  removeMeeting,
  subscribeSchedule,
  type Meeting,
} from "@/lib/schedule";
import { preparePhoto } from "@/lib/photo";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const BUILDINGS = CAMPUS_BUILDINGS.filter((b) => !b.residence)
  .map((b) => b.name)
  .sort();
const DAY_CODE: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

type Draft = Omit<Meeting, "id">;
const empty = (): Draft => ({ course: "", building: "", room: "", days: [], start: "09:30", end: "10:20" });
const daysLabel = (d: number[]) => d.map((x) => DAYS[x]).join(" ");

/** Class Run schedule: private to this phone. Add by hand, import .ics, or read a screenshot (confirm first). */
export default function ScheduleManager() {
  const { meetings } = useSyncExternalStore(subscribeSchedule, getSchedule, getServerSchedule);
  const [draft, setDraft] = useState<Draft>(empty);
  const [pending, setPending] = useState<Draft[] | null>(null); // imported rows awaiting confirmation
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ics = useRef<HTMLInputElement>(null);
  const shot = useRef<HTMLInputElement>(null);

  const field = "w-full rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2.5 text-[16px] text-ink placeholder:text-ink/35 focus:border-teal focus:outline-none";
  const valid = (d: Draft) => d.course.trim() && d.building && d.days.length && /^\d{2}:\d{2}$/.test(d.start);

  return (
    <div className="space-y-5 pb-4">
      <p className="text-[13px] leading-snug text-ink/70">
        Your schedule stays on this phone. About 25 minutes before class you get a waypoint; arrive before it starts for{" "}
        <span className="font-bold text-orange">+{CLASS_RUN_REP} Rep</span>. Missed classes never cost anything.
      </p>

      {msg && <p className="border border-teal/40 bg-teal/10 px-3 py-2 text-[13px] text-ink">{msg}</p>}

      {pending && (
        <section className="hud-panel space-y-2 p-3">
          <h3 className="text-[12px] font-bold tracking-[0.16em] text-gold uppercase">Check these before saving</h3>
          {pending.map((p, i) => (
            <div key={i} className="space-y-1.5 border-b border-white/8 pb-2">
              <p className="text-[14px] font-bold text-ink">
                {p.course} · {daysLabel(p.days)} {p.start}
              </p>
              <select
                value={p.building}
                onChange={(e) => setPending(pending.map((x, j) => (j === i ? { ...x, building: e.target.value } : x)))}
                className={field}
                aria-label={`Building for ${p.course}`}
              >
                <option value="">Pick the building…</option>
                {BUILDINGS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
              {p.room && <p className="text-[12px] text-ink/50">From the file: {p.room}</p>}
            </div>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const ok = pending.filter(valid);
                addMeetings(ok);
                setMsg(`Saved ${ok.length} class${ok.length === 1 ? "" : "es"}${ok.length < pending.length ? ` (${pending.length - ok.length} skipped: no building)` : ""}.`);
                setPending(null);
              }}
              className="min-h-[48px] flex-1 bg-teal text-[14px] font-bold text-night rounded-full"
            >
              Save
            </button>
            <button type="button" onClick={() => setPending(null)} className="min-h-[48px] flex-1 border border-white/12 text-[14px] font-bold text-ink/80 rounded-full">
              Discard
            </button>
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-[12px] font-bold tracking-[0.16em] text-ink/60 uppercase">Your classes · {meetings.length}</h3>
        {meetings.length === 0 ? (
          <p className="text-[14px] text-ink/60">No classes yet.</p>
        ) : (
          <ul className="space-y-2">
            {meetings.map((m) => (
              <li key={m.id} className="hud-panel flex items-center gap-3 px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-ink">{m.course}</span>
                  <span className="block truncate text-[12px] text-ink/60">
                    {daysLabel(m.days)} · {m.start}–{m.end} · {m.building}
                    {m.room ? ` ${m.room}` : ""}
                  </span>
                </span>
                <button type="button" onClick={() => removeMeeting(m.id)} aria-label={`Remove ${m.course}`} className="h-11 w-11 text-[18px] text-ink/50">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="hud-panel space-y-2 p-3">
        <h3 className="text-[12px] font-bold tracking-[0.16em] text-ink/60 uppercase">Add a class</h3>
        <input value={draft.course} onChange={(e) => setDraft({ ...draft, course: e.target.value.slice(0, 40) })} placeholder="Course (e.g. CS 1026)" className={field} />
        <select value={draft.building} onChange={(e) => setDraft({ ...draft, building: e.target.value })} className={field} aria-label="Building">
          <option value="">Building…</option>
          {BUILDINGS.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <input value={draft.room} onChange={(e) => setDraft({ ...draft, room: e.target.value.slice(0, 20) })} placeholder="Room (optional)" className={field} />
        <div className="flex gap-1" role="group" aria-label="Days">
          {DAYS.map((d, i) => {
            const on = draft.days.includes(i);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => setDraft({ ...draft, days: on ? draft.days.filter((x) => x !== i) : [...draft.days, i].sort() })}
                className={`min-h-[44px] flex-1 text-[13px] font-bold ${on ? "btn-sunset" : "bg-white/[0.06] text-ink/70"} rounded-full`}
              >
                {d}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <label className="flex-1 text-[11px] font-bold tracking-[0.14em] text-ink/55 uppercase">
            Start
            <input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} className={`${field} mt-1`} />
          </label>
          <label className="flex-1 text-[11px] font-bold tracking-[0.14em] text-ink/55 uppercase">
            End
            <input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} className={`${field} mt-1`} />
          </label>
        </div>
        <button
          type="button"
          disabled={!valid(draft)}
          onClick={() => {
            addMeetings([draft]);
            setDraft(empty());
            setMsg(`Added ${draft.course}.`);
          }}
          className="min-h-[48px] w-full btn-sunset text-[14px] font-bold text-night disabled:opacity-40 rounded-full"
        >
          Add class
        </button>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => ics.current?.click()} className="min-h-[48px] border border-white/12 bg-white/[0.04] text-[13px] font-bold text-ink rounded-full">
          Import .ics
        </button>
        <button type="button" disabled={busy} onClick={() => shot.current?.click()} className="min-h-[48px] border border-white/12 bg-white/[0.04] text-[13px] font-bold text-ink disabled:opacity-50 rounded-full">
          {busy ? "Reading…" : "From screenshot"}
        </button>
        <input
          ref={ics}
          type="file"
          accept=".ics,text/calendar"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const rows = parseIcs(await f.text());
            if (!rows.length) return setMsg("No weekly classes found in that file.");
            setPending(rows);
          }}
        />
        <input
          ref={shot}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setBusy(true);
            try {
              const { image } = await preparePhoto(f);
              const r = await fetch("/api/schedule/parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image }) });
              const j = await r.json();
              if (!r.ok) return setMsg(j.message ?? "Couldn't read that screenshot.");
              const rows: Draft[] = (j.rows as { course: string; location: string; days: string[]; start: string; end: string }[]).map((x) => ({
                course: x.course.slice(0, 40),
                building: matchBuilding(x.location) ?? "",
                room: x.location.slice(0, 40),
                days: x.days.map((d) => DAY_CODE[d]).filter((d) => d !== undefined),
                start: x.start,
                end: x.end,
              }));
              if (!rows.length) setMsg("No classes found in that screenshot.");
              else setPending(rows);
            } finally {
              setBusy(false);
            }
          }}
        />
      </section>

      {meetings.length > 0 && (
        <button
          type="button"
          onClick={() => {
            clearSchedule();
            setMsg("Schedule deleted from this phone.");
          }}
          className="min-h-[48px] w-full text-[13px] font-bold tracking-[0.14em] text-pink rounded-full"
        >
          Delete my schedule
        </button>
      )}
    </div>
  );
}
