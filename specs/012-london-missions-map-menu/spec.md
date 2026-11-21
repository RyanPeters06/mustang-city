# Feature Specification: London Missions, Map-Menu Overview, Region Select, Cinematic Entrance

**Created**: 2026-11-21 · **Status**: Done · **Branch**: `claude/file-editing-offline-9q9lv2`

**Input**: Ryan — research London and add specific missions; fix the zoomed-out view; sharper map-menu UI;
tap a region to raise it; a cinematic zoom-in entrance; better logo and assets.

## What shipped
1. **11 London landmark missions** (history), each with one sourced fact, year and source link; coordinates
   geocoded with Mapbox (addresses) or taken from heritage records: Blackfriars Bridge, Middlesex County Court
   House, Covent Garden Market, Grand Theatre, St. Peter's Cathedral Basilica, Storybook Gardens, Forks of the
   Thames, Victoria Park, Lawson site, Wolseley Hall, UC Memorial Tower. Mirrored in `db/seed.sql`.
2. **Overview map** — removed pixel-offset surf rings (noisy rotated squares); fixed the FOREST STATE title
   (zoom expression nested inside `*` never rendered); faint major roads + Thames drawn above the fog so the city
   reads at z9–13; chart grid over the sea; district names from z9.6; smaller blips at overview.
3. **Region select** — at zoom < 14, tapping a neighbourhood extrudes it (pink, 450 m, eased), frames it above
   the sheet and opens a region card (explored %, 30 % unlock progress, +50 Rep, jobs inside, city profile link).
4. **Sharper chrome** — global radii cut to 3–8 px; cut-corner HUD with sunset rule; square tab bar with
   tracked caps and a sunset indicator; `hud-panel` (hairline, accent edge, clipped corner); sheet sunset edge.
5. **Entrance** — loader with rotating tips → "Tap to enter" → letterboxed flight (Forest State push-in, dive to
   Mustang City) with establishing captions and Skip; HUD/tab bar slide in. Once per session; reduced motion
   jumps; demo panel can replay.
6. **Brand** — original emblem (striped sunset behind a pine skyline for the "Forest City", in a horseshoe),
   sunset wordmark, redrawn app/apple icons.

## Accuracy
- Landmark `brief` text only states facts found in the cited source; Goose briefings stay vague (no facts).
- Where sources disagreed (Covent Garden 1835 licence vs 1845 site; Blackfriars "oldest" claims), the brief
  uses the date/claim the cited source supports and omits the disputed superlative.

## Verification
- Real Mapbox map in Chromium (iPhone 15 viewport): overview z9.4 / z10.6, region tap (Bostwick rises), intro
  frames (title → captions → landed). tsc, lint, build.
