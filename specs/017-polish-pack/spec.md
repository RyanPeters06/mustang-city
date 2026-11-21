# Feature Specification: Polish Pack

**Created**: 2026-11-21 · **Branch**: `claude/file-editing-offline-9q9lv2`

**Input**: Backlog — poster-style mission cards (canvas + Web Share), hidden collectibles, radar HUD, fog decay
(6 months), student-written missions with Gemini screening, live weather overlay.

## Part A — Hidden collectibles ✅
- 12 collectibles (`lib/collectibles.ts`, seeded in `db/seed.sql`), each with ONE stored, sourced fact (no generated
  lore — accuracy rule overrides the brief's "Gemini-written" line). Invisible until within 50 m (live GPS / demo
  walk, never replays, ±50 m accuracy). +25 Rep each (brief Rep table). Toast "Collectible found · n/12".
- Found ones: gold diamond on the map (tap → lore card with source), Profile grid (unfound stay "?").

## Part B — Radar HUD ✅
- 92 px circular radar under the HUD (brief: "mini radar" in the top HUD): north-up, 600 m range, sweep (hidden for
  reduced motion), player arrow with heading; blips = unfinished missions (type colours), buses (route colour),
  found collectibles (diamonds), tags. Area banner moved below it; transit chip shows only when the feed isn't live.

## Verification (A+B)
- Browser: GPS next to "The Jurys' Trowel" → toast, Rep 4 → 29, pin, Profile grid 1/12, lore card; radar blips.

## Part C — Poster-style mission cards ✅
- Passed photo missions get "Make a poster" → 1080×1350 JPEG: photo cover-cropped, sunset gradient-map duotone,
  scanlines, vignette, angled MISSION PASSED stamp, category, title, +Rep, date · FOREST STATE, sunset rule.
  Full-res photo used while in memory this session, else the saved thumbnail. Web Share with files; download fallback.

## Part D — Fog decay ✅
- Per-cell last-visit day stamps on the device (`lib/fogAge.ts`). Cells not revisited in 182 days fade under a haze
  layer; they stay explored (% / Rep never drop — deliberate, gentle interpretation). Revisiting clears the haze.
  Demo: "Age fog 200 days" / "Refresh fog".

## Part E — Live weather ✅
- `GET /api/weather` → Open-Meteo current weather for London (free, no key, CC BY 4.0 credited in Profile), 10-min
  cache, honest "unavailable". Canvas rain/snow particles (lightning flashes for storms, haze for fog), static for
  reduced motion; HUD shows temperature + condition. Demo: rain / snow / live.
- Open-Meteo returned 429 from the cloud build machine (shared IP) — check on Vercel.

## Part F — Student-written missions ✅ (server paths need DB + Auth0 + Gemini)
- Missions tab → Student jobs: list (score-sorted, buried at −3 hidden), ▲/▼ votes, inline briefing, check-in.
- `POST /api/missions/community` creates a check-in job at your GPS spot: title 4–50, briefing ≤ 140, same privacy
  checks as tags, Gemini screening REQUIRED (unsafe, private property, trespass, people) — no key → refused;
  3 per day (`missions.created_at`). Vote + complete routes verify server-side; creator gets +10 Rep per upvote
  (counted in /api/me). Completion 50 Rep.
- Accounts off: two labelled sample jobs; their check-in shows the moment but never saves.

## Verification (C–F)
- Poster PNG inspected; decay haze vs revisit compared; rain/snow captured; sample job voted + checked in →
  MISSION PASSED. tsc, lint, build. Not verifiable here: Gemini screening, DB-backed jobs, live Open-Meteo.
