# Feature Specification: Class Run

**Created**: 2026-11-21 · **Status**: Done · **Branch**: `claude/file-editing-offline-9q9lv2`

**Input**: Backlog — schedule import + class waypoints + on-time Rep (design in `docs/roadmap.md`).

## Stories
1. Profile → **Class Run** → add classes by hand (course, building picker of 89 campus buildings, room, days,
   times), import a `.ics` export (parsed on the phone), or read a timetable screenshot with Gemini (rows shown for
   confirmation; unmatched buildings must be picked). One-tap **Delete my schedule**.
2. ~25 min before a class: **Next class** card under the HUD (course, building, start, walking minutes) with
   one-tap waypoint (same walking-route system as missions).
3. Arrive inside the building radius (70 m) **before** start and stay ≥ 2 min → **+20 Rep**, toast, once per
   class meeting. Never penalises missed classes.
4. Badge **Perfect Attendance**: 5 on-time arrivals in one Mon–Sun week.

## Privacy
- Schedule lives only in this phone's storage; never synced, never on profiles or to friends. Screenshot is sent to
  the server only for reading and is not stored. Earned Rep stays in progress even after deleting the schedule.

## Notes
- Building matching: names first, then a best-effort list of common Western codes (MC, UCC, SSC, AHB, …); anything
  unmatched asks the student. "Found It" (first-week new buildings) from the roadmap is not built — logged.
- Standing still produces no new GPS fixes, so arrival is also re-checked every 20 s from the last fix.

## Verification
- Browser: added CS 1026 at Middlesex College starting in 12 min → card "Next class · 11 min · 6 min walk";
  waypoint route drawn; GPS at Middlesex → class run recorded after 130 s; Rep +20. tsc, lint, build.
- Not verified here: screenshot import (needs GEMINI_API_KEY).
