# Roadmap: future considerations

Items here come **after** the brief's build plan and cut list are done. They are designed now so
today's data model and UI don't block them.

## Class Run — schedule-aware waypoints (future, post-core)

**Idea:** students add their class schedule; Mustang City shows which buildings their classes are in,
sets a GTA-style waypoint to the next class, and rewards getting there.

**How it would work**
1. **Import** (in order of effort):
   - Photo or screenshot of the timetable → Gemini reads it into structured rows
     `{course, section, building, room, days[], start, end, termStart, termEnd}` (structured output, user
     confirms each row before saving).
   - `.ics` calendar export upload, parsed server-side.
   - Manual add (course code + building picker + times) as the always-works fallback.
2. **Building matching:** building names/codes are matched to the 89 named campus buildings already in
   `lib/data/campusBuildings.json` (add a `code` column, e.g. MC, UCC, NS, SSC, AHB). Unmatched rows
   ask the student to pick the building on the map.
3. **Waypoints:** ~20 min before a class, a "Next class" card appears (course, building, start time,
   walking minutes). One tap sets the glowing walking route (same waypoint system as missions).
4. **Rewards (Rep, not separate XP — Rep stays the single currency):**
   - Arrive inside the building radius before start → **+20 Rep** ("Class Run").
   - Streaks: 5 on-time arrivals in a week → badge **"Perfect Attendance"**; first week of term →
     **"Found It"** for every new building reached.
   - Caps: once per class meeting; must be within radius ≥ 2 min (no drive-by farming).
   - Never penalise missed classes (no shame mechanics).
5. **Privacy:** schedules are private to the student, never shown on profiles or to friends, deletable in
   one tap. Optional later: "classmates nearby" only as opt-in, and only as counts.

**Data model additions (not built):**
`class_meetings(id, user_id, course, section, building_name, building_code, room, weekday, start_time,
end_time, term_start, term_end)` and `class_checkins(user_id, meeting_id, date, arrived_at, rep)` —
check-ins can reuse `location_pings` for proof.

**Why it fits:** it turns the daily commute into the game loop, helps first-years find buildings in week
one, and drives the core metric (places visited) without extra effort from the student.

**Risks:** OCR mistakes on timetables (mitigated by the confirm step), building-name ambiguity, Western's
Student Center export format may change.

## Other later items
- Live friend locations (opt-in, neighbourhood-blurred) — already in the brief as optional.
- Business-sponsored missions (pitch only for now).
