# Feature Specification: Faculty Turf + Heists

**Created**: 2026-11-21 · **Status**: Done (server paths need DB + Auth0 to verify) · **Branch**: `claude/file-editing-offline-9q9lv2`

**Input**: Backlog — districts tinted by faculty with most Rep; heist missions needing 3+ players within radius/time
window. *Done when:* turf colours update from DB; a 3-account heist completes.

## Turf
- `GET /api/turf` (aggregate only): per neighbourhood, the faculty whose players have cleared the most res-11 cells
  there (cell → district by point-in-polygon, memoised), with its share. 5-min cache. 503 without DB.
- Map: `turf-fill` tints each held district in its faculty colour (`lib/faculty.ts`, 12 colours), strongest at city
  zoom, gone by z14. Refreshes every 5 min. Region card shows "Held by X · n% of cleared ground" or honest fallback.
- Note: uses cleared ground (cells) rather than Rep — cells are what's geographic; Rep from missions isn't tied to a
  district. Recorded as a deliberate interpretation.

## Heists
- 3 heist missions on campus (Alumni Hall, Thompson Arena, Ivey), 300 Rep, radius 120 m (geocoded).
- `POST /api/heists` joins/starts the open attempt (location + ±50 m GPS checked server-side); when 3 distinct
  players are in within 15 min it completes in one transaction: completion + Rep for every member (once).
  `GET` polls the crew. Expired attempts are marked on read. `/api/missions/verify` refuses heists (no solo passes).
- Mission card: crew slots, countdown, Start/Join; polls every 5 s; MISSION PASSED for each member.
- Heister badge = 3 heists completed.

## Demo (accounts off)
- Demo panel → "Sample faculty turf" (deterministic, labelled "sample") and "Demo heist crew" (two simulated
  members arrive, labelled "demo"). Never shown unless toggled.

## Verification
- Browser: sample turf patchwork at overview; region card turf line; demo heist 1/3 → 2/3 → MISSION PASSED.
- Not verifiable here: real turf from DB and a 3-account heist (no DATABASE_URL / Auth0 in this environment).
