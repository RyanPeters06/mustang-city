# Build backlog

The `/build-next` skill works through this list **top to bottom, one item per run**. Order follows the
brief's build plan and cut list (core first). Each item has "Done when" checks the agent verifies itself.

Status marks: `[ ]` todo · `[x]` done · `[~]` blocked (reason in the line) · `[>]` in progress

## Needs from Ryan (unblocks items below)
- `GEMINI_API_KEY` — photo checks, goose dialogue, radio host
- Auth0 app + `AUTH0_*`, `APP_BASE_URL` — sign-in, friends, leaderboards
- `DATABASE_URL` (Tiger Data) + `npm run db:schema && npm run db:seed` — accounts, friends, leaderboards, turf

## Queue

- [x] **Replay mode (core #6)** — record the live GPS trace to the device (and `location_pings` when signed in);
  "Replays" list in Profile; play any trace back at 1×/4×/16× so fog clears on screen; demo panel can load
  a bundled sample walk. *Done when:* a recorded 2-minute walk replays at 16× with fog clearing and the
  arrow following; replay never writes new reveals twice.
- [x] **Rank-up toast + badges** — full-screen "RANK UP" moment when rank changes; badge engine for the
  brief's six badges (Cartographer, Goose Whisperer, Night Owl, Heister, Route 6 Regular, Every Route) with a Badges grid
  on Profile; titles selectable under the name. *Done when:* crossing 1,000 Rep (via demo controls) shows the
  toast once; earned badges persist.
- [x] **Neighbourhood unlocks** — London neighbourhood polygons (OSM `place=neighbourhood|suburb` or City of
  London open data, record the source), unlock at 30% of a neighbourhood's cells, +50 Rep, toast, list on
  Profile, large stylised district names at city zoom. *Done when:* demo walk through Old East Village unlocks it.
- [x] **Server ping log** — write live GPS fixes to the `location_pings` hypertable when signed in (batched),
  so replays/Wrapped survive device changes. *Done when:* a signed-in walk appears in `location_pings`; no-op without DB.
- [ ] **Leaderboards** — weekly + all-time, filter friends / faculty / all Western, by Rep and % explored
  (continuous aggregate for weekly Rep). *Done when:* two test accounts rank correctly; degrades without DB.
- [ ] **Time-of-day palette** — suncalc sunrise/sunset for London drives `lightPreset` (dawn/day/dusk/night),
  re-evaluated every 10 min. *Done when:* forcing the clock to sunset switches to dusk without reload.
- [ ] **The Goose quest-giver** — original goose crime-boss portrait (SVG, original art), appears on mission
  briefings; Gemini rewrites briefings in character from stored text (fallback to stored text). *Done when:*
  briefings show the portrait; no facts are added to landmark text.
- [ ] **Geo-pinned tags** — leave a note/photo on your current cell; others see it once their fog there is
  cleared; upvotes (+10 Rep). *Done when:* tag created by A appears for B only after B reveals that cell.
- [ ] **AI radio host** — tap-to-start radio; Gemini script from current neighbourhood + nearby landmarks,
  Gemini TTS voice; never autoplay. *Done when:* entering a new neighbourhood queues a 15-second segment.
- [ ] **Graduation Wrapped** — Spotify-Wrapped-style recap (fog timelapse from replay data, stats,
  percentile), shareable card via Web Share. *Done when:* Wrapped renders from current progress and shares an image.
- [ ] **Live buses + route collection** — LTC GTFS static + GTFS-RT in an API route, buses animate on the map,
  mission cards show next arrival; ride detection; "Every Route" progress. *Done when:* live buses move
  (or cached last-good feed with a "delayed" label).
- [ ] **Faculty turf + heists** — districts tinted by faculty with most Rep; heist missions needing 3+ players
  within radius/time window. *Done when:* turf colours update from DB; a 3-account heist completes.
- [ ] **Polish pack** — poster-style mission cards (canvas + Web Share), hidden collectibles, radar HUD,
  fog decay (6 months), student-written missions with Gemini screening, live weather overlay.
- [ ] **Hero 3D model: Middlesex College** — low-poly glTF via Mapbox `model` layer at z ≥ 16 (see
  `specs/003-friends-buildings/research.md`). *Done when:* model replaces the extrusion, stays at 60 fps.
- [ ] **Class Run** — schedule import + class waypoints + on-time Rep (design in `docs/roadmap.md`).

## Done
- [x] Friday foundation (spec 001) · [x] Missions & profiles (spec 002) · [x] Friends & building cards (spec 003)
