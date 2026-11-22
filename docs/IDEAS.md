# Ideas log (for Ryan's review — not built)

Everything here is **logged only**. Nothing in this file is implemented. Tick `[x]` on anything you want built and
it moves to `docs/BACKLOG.md`. Effort: S (< 2 h) · M (half day) · L (a day+). Impact on judges: ★–★★★.

All theming stays original: "GTA 6-inspired" in public copy only — no Rockstar names, logos, fonts, art or music.

---

> **Nov 22:** Ryan approved everything; ticked rows below are built (see docs/BACKLOG.md "Approved Nov 22").

## 0. Ranked by hackathon win odds (Nov 21)

How judges actually see the project: the Devpost video first, then ~3 minutes of live demo, often holding the phone
themselves. So ranking = (how much a judge notices it in that window) × (how likely it lands) ÷ effort.

| # | Idea | Why it moves the odds | Effort |
|---|---|---|---|
| 1 | **Devpost trailer** (§1) | Judges watch the video before anything else; intro flight + fog timelapse + MISSION PASSED cut to music | M |
| 2 | **Comic-panel cover art intro** (§8, Ryan) | Sells the genre in the first 5 seconds of both the video and the live demo; cheap if the art is generated | S (+ art) |
| 3 | **Live big-screen mirror `/stage`** (§1) | Fog clearing live on a laptop while you walk up to the judges is the "wow" moment | M |
| 4 | **"Wanted level" for curiosity** (§1) | Instantly reads as the genre, tiny build, shows on every screen | S |
| 5 | **The Goose calls you** (§1) | Character + Gemini TTS = memorable + strengthens the Gemini sponsor prize | M |
| 6 | **First-run coach marks** (§5) | Judges hold the phone cold; 3 pointers stop them getting lost | S |
| 7 | **Stash & carry inventory** (§8, Ryan) | Gives the city a real game loop ("bring it home to Mustang City") — great pitch line; needs a scripted demo beat to show | M |
| 8 | **Pause-screen music** (§4) | Atmosphere makes every demo second feel like a game; procedural version needs no licence | S |
| 9 | **Near-miss nudges** (§2) | "3% from unlocking Old East Village" is a one-line demo of the hook loop | S |
| 10 | **Photo mode** (§1) | Shareable stills for Devpost/socials | S |
| 11 | **Variable rewards on pass** (§2) | Makes the MISSION PASSED beat land harder | S |
| 12 | **Accessibility mode** (§1) | Impact story some judges weigh heavily | M |
| 13 | **O-Week mode** (§1) | Real-user adoption story at Western | S |
| 14 | **Daily Job + forgiving streaks** (§2) | Retention judges ask about; mostly a pitch slide | S |
| 15 | **Radio news interruptions** (§1) | Nice, but needs friends + radio on during the demo | M |
| 16 | **Loot challenges between players** (§8, Ryan) | Exciting, but needs real-time multiplayer, opt-in location and a mini-game — high risk of a broken demo | L |
| 17 | **Heist trailer generator** (§1) | Strong but big; the Devpost trailer covers most of the value | L |
| 18 | Push notifications, seasonal events, collection sets, friend overlap, surprise blips, rank perks (§2) | Long-term retention; little visible in 3 minutes | S–M |
| 19 | **Sustainability stats** (§1) | Only matters for a sustainability track | S |

**Suggested next build order if approved:** 2 → 4 → 6 → 8 → 1 (record the trailer last, once everything looks final) → 3 → 5 → 7.

## 1. Hackathon-winning ideas

| ✓ | Idea | Why it wins | Effort | Impact |
|---|---|---|---|---|
| [x] | **"Wanted level" for curiosity** — 1–5 stars that rise while you're in a fogged area for the first time and fade when you've cleared it; stars glow on the HUD | Instantly reads as the genre to every judge; zero IP (stars are generic) | S | ★★★ |
| [x] | **Live demo mode on the big screen** — `/stage` route: full-screen map that mirrors your phone's fog in real time while you walk the judging hall | Judges watch fog clear live as you walk up to them | M | ★★★ |
| [x] | **Heist trailer generator** — after a heist completes, auto-cut a 10-second vertical video (replay trace + photos + captions) via canvas + MediaRecorder, shareable | Social virality story; great demo closer | L | ★★★ |
| [x] | **The Goose calls you** — fake incoming-call screen (original UI) when a new mission unlocks nearby; Gemini TTS voice line | Memorable character moment, uses Gemini TTS | M | ★★★ |
| [ ] | **Faculty war room** — weekly turf map where each faculty's colour floods the districts it leads; Monday "turf report" card | Campus-wide competition → retention + demo beat | M | ★★ |
| [x] | **Mustang City Radio "news" interruptions** — when a friend unlocks a district, the radio host breaks in with a 5-second bulletin | Ties social + AI + audio together | M | ★★ |
| [x] | **Photo mode** — hide UI, letterbox, film grain, sunset LUT, date/location stamp; share card | People share screenshots = free marketing | S | ★★ |
| [x] | **Accessibility pitch** — "explore without walking" mode: wheelchair-accessible routes from City of London open data, fog clears along accessible paths | Strong impact story for judges | M | ★★ |
| [x] | **Sustainability track** — kilometres walked vs. driven, CO₂ saved, LTC rides counted | Fits sponsor tracks | S | ★ |
| [x] | **Orientation-week mode** — Western O-Week preset missions (residence → classes → food) for first-years | Real user pull at Western | S | ★★ |
| [ ] | **Devpost assets** — 60-s trailer cut from the intro flight + replay, original synthwave bed, captions | Judges watch the video first | M | ★★★ |

## 2. Keeping players hooked (retention)

| ✓ | Hook | Mechanic | Effort |
|---|---|---|---|
| [x] | **Daily Job** | One rotating Goose mission per day, +2× Rep if done before midnight; streak flame on the HUD | S |
| [x] | **Streaks with forgiveness** | Walk-streak (any new fog per day); one "safehouse day" freeze per week so streaks don't feel punishing | S |
| [ ] | **Weekly reset leaderboards** | Already have weekly Rep; add Monday push "You finished #4 in Science — 120 Rep behind #3" | S |
| [x] | **Near-miss nudges** | "You're 3% from unlocking Old East Village" when the app opens; region card shows the closest unexplored street | S |
| [x] | **Collection sets** | Landmark sets (Bridges, Haunted, Film Sets, Heritage Plaques) with set-completion badges and a profile shelf | M |
| [ ] | **Fog regrowth (opt-in)** | Cells untouched for 6 months slowly re-fog (already in Polish pack) → reason to revisit | M |
| [x] | **Friend fog overlap** | "You and Maya have both cleared 12% of downtown — 3% overlap" + co-op missions that need both | M |
| [x] | **Seasonal events** | Homecoming, Halloween (haunted Grand Theatre hunt), Winter "Frost City" palette, Grad Week Wrapped | M |
| [x] | **Surprise blips** | Random gold blips that exist for 2 hours (location from a seeded daily RNG) worth bonus Rep | S |
| [x] | **Rank perks** | Each rank unlocks something visible: HUD colours, map filters, emblem, title, radio station | S |
| [ ] | **Push notifications (PWA)** | iOS 16.4+ supports web push for home-screen PWAs: daily job, friend passed you, streak at risk | M |
| [x] | **Variable rewards on mission pass** | Small chance of a rare "golden photo" frame or bonus Rep roll — the pass screen becomes a slot-machine moment | S |

## 3. Real 3D models of Western's buildings

**Goal:** Middlesex College, UC, Weldon etc. as textured 3D models (even mini) instead of grey extrusions.

What exists today (researched Nov 2026):
- **Mapbox Standard** draws OSM footprints as untextured extrusions; London, ON has no Mapbox landmark models.
- **Google Photorealistic 3D Tiles** (Map Tiles API) have photogrammetry for many cities and *can* be drawn with
  deck.gl `Tile3DLayer`. But Google's policies are written around Google basemaps and attribution; using them on top
  of a Mapbox basemap needs a read of the Map Tiles API policies + Google Maps Platform ToS first, plus a paid
  Google key. Coverage of Western's campus must be checked in Google Earth. **Risky for a hackathon.**
- **Sketchfab / existing models:** no Western campus models found. A Western CulturePlex project once built
  SketchUp campus models for Google Earth (status unknown — could ask the department).
- **Mapbox model layer** supports glTF 2.0 (`model` layer + GeoJSON `model-uri`), and the experimental
  `clip` layer can remove the OSM extrusion where the custom model goes. This is the clean path.

Options to get textured models (ranked):
1. **Phone photogrammetry → glTF** (recommended): walk around Middlesex College with an iPhone app that exports
   glTF/USDZ (e.g. Polycam, RealityScan, Luma). Decimate in Blender to ~20–50k triangles, bake textures to one
   1–2k atlas, Draco/meshopt compress to < 2 MB, place with the Mapbox `model` layer + `clip` layer. ~2–3 h per
   building. Real textures, fully ours.
2. **AI image-to-3D** (e.g. Meshy, Tripo, Rodin): a few photos → textured mesh in minutes. Lower accuracy, good for
   "mini" stylised versions; check each tool's commercial licence.
3. **Hand-built low-poly** in Blender from photos + OSM footprint + heights: Middlesex College = collegiate gothic
   sandstone block + square clock tower; UC = long stone hall + Middlesex Memorial Tower. Stylised to match the
   neon night palette (emissive window strips). ~3–4 h each. Most "game-like".
4. **Procedural textures on extrusions** (no models): pattern fills for stone, window bands via `fill-extrusion`
   patterns. Cheap but still boxy.

**Built (spec 019):** Ryan said to go ahead with whatever I can do, so option 3 is done by script (no Blender): Middlesex College, University College and 19 campus-core buildings from real footprints. Option 1 (phone photogrammetry) is still the upgrade path for photo-real facades.
Backlog item "Hero 3D model: Middlesex College" already covers placing it.

## 4. Pause-screen music

How the genre does it: a calm ambient/synth bed plays only while the map/pause menu is open, ducks when you
close it, and never autoplays loudly.

Options (all original or properly licensed — never copy game soundtracks):
1. **Procedural Web Audio pad** (built in, zero licensing): slow detuned saw pads + filtered arpeggio in a minor
   key, tempo 84, generated in the browser; ~150 lines. Starts after the "Tap to enter" gesture.
2. **Licensed track**: Pixabay Music (commercial use, no attribution required — still credit the artist; can't
   resell the file) or CC-BY tracks from itch.io/OpenGameArt (must credit). Pick 2–3 synthwave/lo-fi loops.
3. **AI-generated original**: generate a 60-second loop with an AI music tool whose terms grant commercial use;
   keep the prompt + licence in the repo.

Behaviour to build: plays while any sheet is open (the "pause menu"), fades to 0 over 600 ms when the map is back,
mute toggle in Profile, respects iOS silent switch / no autoplay. Radio host (backlog) layers on top.

## 5. Friendlier UX

- [ ] First-run coach marks: three short pointers (fog, missions, tap a region) — skippable, shown once.
- [ ] Permission explainer before the iOS location prompt (why, what's stored, "never shared live").
- [ ] Empty states that suggest the next action (e.g. Crew with no friends → "Share your code" button first).
- [ ] Haptics on mission pass / unlock where supported (`navigator.vibrate` on Android; iOS ignores it).
- [ ] Bigger "what to do next" card on the map when idle for 10 s: nearest mission + distance.
- [ ] Offline banner + queued actions (tags/missions retry when back online).
- [ ] Text size respects iOS Dynamic Type via `rem` + a large-text toggle.
- [ ] Legend panel with blip toggles (brief: "legend panel lists blip types ... each with a toggle").

## 6. Map-menu design notes (applied in spec 012, more to try)

Applied: sharp 3–8 px radii, cut corners, hairline borders, sunset accent rules, wide-tracked caps labels,
chart grid over the sea, ghost roads, big region names, raised selected region, letterboxed establishing shots.

Still to try (logged):
- [ ] Satellite-style overview: Mapbox satellite raster at 40 % under the fog at z < 12 for a "real map" texture.
- [ ] Legend + blip list column on the map (left side) like a pause map.
- [ ] Waypoint "set" sound + pulsing route line.
- [ ] Condensed UI typeface for labels (e.g. Barlow Condensed / Oswald from Google Fonts) to pair with Anton.
- [ ] Rank-up screen in the same letterbox style as the intro.

## 6b. Logged during builds (not built)
- [ ] Class Run "Found It" badge: every new class building reached in the first week of term (needs term dates).
- [ ] Sync collectible finds + class runs to the account (tables exist: `collectible_finds`; class tables in roadmap).
- [ ] Student jobs on the map as blips + waypoint (currently list-only in the Missions tab).
- [ ] Legend panel with blip-type toggles (brief §Map).

## 8. Ryan's ideas (Nov 21) — logged, not built

### Stash & carry inventory (Mustang City is your stash)
- **Loop:** loot you pick up out in Forest State (collectibles, mission rewards, rare drops) goes into a **carry bag** with
  limited slots (e.g. 6, +1 per rank). It only becomes permanent once you **bank it at the stash** — any spot inside
  Mustang City (campus geofence), or a stash building like UCC. Full bag → you must go back to campus or drop something.
- **Why it fits:** turns campus into home base (the brief's whole premise), gives every trip out a reason to come back,
  and makes Rep from loot feel earned. Shows well as a HUD bag counter + a "STASHED" moment when you walk onto campus.
- **Build sketch:** `inventory` (carried) and `stash` tables (or device storage first); items = existing collectibles +
  mission drops; bag UI in Profile; geofence check in the location pipeline (same as Class Run arrival).
- **Effort:** M for single-player (no DB needed to demo).

### Losing loot / player challenges (multiplayer)
- **Idea:** unbanked loot is at risk — another player can **challenge** you (a quick mini-game) and the loser drops an
  item from their bag. Banked loot is always safe.
- **Mini-game options:** reaction duel, rock-paper-scissors best of 3, or a **London trivia duel** using the sourced
  landmark facts (on-brand, educational, no physical risk).
- **Must-haves (privacy/safety, constitution):** both players opt in; never show exact positions — only "a challenger is
  nearby" within the same coarse area (H3 res-8, ~0.7 km²); challenges happen in the app, never require approaching
  someone; easy decline; no challenges in residences; rate limits.
- **Build sketch:** needs DB + Auth0 + a realtime channel (polling or Supabase/Pusher-style); `challenges` table.
- **Effort:** L; demo risk high without two real accounts on stage. Good "roadmap" slide even if not built.

### Comic-panel cover art intro
- **Idea:** the intro's title card becomes a fragmented collage of angled comic-style panels (like big open-world game
  covers): London scenes — Blackfriars Bridge, Covent Garden, the UC tower, an LTC bus, The Goose, a student on UC Hill —
  in the sunset palette, panels sliding in one by one before "Tap to enter".
- **IP guardrails (constitution: original IP only):** use **our own** Mustang City / Forest State wordmark in the layout,
  not a parody of the GTA logo or its typeface — a recognisable parody of a trademarked logo is exactly what the rules
  forbid and is risky on a public Devpost. The *collage layout* is a generic style and is fine. Prompts must not name
  GTA, Rockstar or copy specific cover art; no real people's faces; keep the prompts + the image tool's licence in the repo.
- **What I need if Ryan generates it:** 6–8 separate panel images (~1024 px, any aspect), or one 1080×1920 collage plus
  a version without text. I'll handle the angled framing, sunset grading, animation and the wordmark in code.
- **Alternative:** with `GEMINI_API_KEY`, I can generate the panels with Gemini's image model from written prompts.
- **Effort:** S once the art exists.

## 7. Needs from Ryan

| Need | Unblocks | Status |
|---|---|---|
| ~~Mapbox public token~~ | Real-map testing in cloud sessions | ✅ given (kept in git-ignored `.env.local`; add `localhost` + your domains to its URL restrictions) |
| `GEMINI_API_KEY` | Goose rewrites, photo checks, tag screening, radio, TTS | needed |
| Auth0 tenant + `AUTH0_*`, `APP_BASE_URL` | Sign-in, friends, leaderboards, server tags | needed |
| `DATABASE_URL` (Tiger Data) + `npm run db:schema && npm run db:seed` | Accounts, tags (`tag_votes`), new missions in DB | needed |
| Decision: merge `claude/file-editing-offline-9q9lv2` → `main` (or let me push to `main`) | Vercel deploy of all this work | decision |
| ~~Approve 3D model route (§3)~~ | Built stylised models (spec 019) | ✅ done |
| Check live weather on the deployed site (Open-Meteo returned 429 to the cloud build machine) | HUD temperature + rain/snow | check |
| Pick a music route (§4) | Pause-screen music | decision |
| Cover-art panels (§8) — or a Gemini key so I generate them | Comic-panel intro | optional |
| Approve which ranked ideas to build (§0) | Next build round | decision |
| Photos of Middlesex College / UC (any angle) | Option 3 hand-built models, textures | optional |
| Check live buses on the deployed site (LTC realtime host `gtfs.ltconline.ca` reset connections from the cloud build machine; static schedule works) | Live buses status chip should say "Live" | check |
