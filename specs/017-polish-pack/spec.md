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
