# Ideas log (for Ryan's review — not built)

Everything here is **logged only**. Nothing in this file is implemented. Tick `[x]` on anything you want built and
it moves to `docs/BACKLOG.md`. Effort: S (< 2 h) · M (half day) · L (a day+). Impact on judges: ★–★★★.

All theming stays original: "GTA 6-inspired" in public copy only — no Rockstar names, logos, fonts, art or music.

---

## 1. Hackathon-winning ideas

| ✓ | Idea | Why it wins | Effort | Impact |
|---|---|---|---|---|
| [ ] | **"Wanted level" for curiosity** — 1–5 stars that rise while you're in a fogged area for the first time and fade when you've cleared it; stars glow on the HUD | Instantly reads as the genre to every judge; zero IP (stars are generic) | S | ★★★ |
| [ ] | **Live demo mode on the big screen** — `/stage` route: full-screen map that mirrors your phone's fog in real time while you walk the judging hall | Judges watch fog clear live as you walk up to them | M | ★★★ |
| [ ] | **Heist trailer generator** — after a heist completes, auto-cut a 10-second vertical video (replay trace + photos + captions) via canvas + MediaRecorder, shareable | Social virality story; great demo closer | L | ★★★ |
| [ ] | **The Goose calls you** — fake incoming-call screen (original UI) when a new mission unlocks nearby; Gemini TTS voice line | Memorable character moment, uses Gemini TTS | M | ★★★ |
| [ ] | **Faculty war room** — weekly turf map where each faculty's colour floods the districts it leads; Monday "turf report" card | Campus-wide competition → retention + demo beat | M | ★★ |
| [ ] | **Mustang City Radio "news" interruptions** — when a friend unlocks a district, the radio host breaks in with a 5-second bulletin | Ties social + AI + audio together | M | ★★ |
| [ ] | **Photo mode** — hide UI, letterbox, film grain, sunset LUT, date/location stamp; share card | People share screenshots = free marketing | S | ★★ |
| [ ] | **Accessibility pitch** — "explore without walking" mode: wheelchair-accessible routes from City of London open data, fog clears along accessible paths | Strong impact story for judges | M | ★★ |
| [ ] | **Sustainability track** — kilometres walked vs. driven, CO₂ saved, LTC rides counted | Fits sponsor tracks | S | ★ |
| [ ] | **Orientation-week mode** — Western O-Week preset missions (residence → classes → food) for first-years | Real user pull at Western | S | ★★ |
| [ ] | **Devpost assets** — 60-s trailer cut from the intro flight + replay, original synthwave bed, captions | Judges watch the video first | M | ★★★ |

## 2. Keeping players hooked (retention)

| ✓ | Hook | Mechanic | Effort |
|---|---|---|---|
| [ ] | **Daily Job** | One rotating Goose mission per day, +2× Rep if done before midnight; streak flame on the HUD | S |
| [ ] | **Streaks with forgiveness** | Walk-streak (any new fog per day); one "safehouse day" freeze per week so streaks don't feel punishing | S |
| [ ] | **Weekly reset leaderboards** | Already have weekly Rep; add Monday push "You finished #4 in Science — 120 Rep behind #3" | S |
| [ ] | **Near-miss nudges** | "You're 3% from unlocking Old East Village" when the app opens; region card shows the closest unexplored street | S |
| [ ] | **Collection sets** | Landmark sets (Bridges, Haunted, Film Sets, Heritage Plaques) with set-completion badges and a profile shelf | M |
| [ ] | **Fog regrowth (opt-in)** | Cells untouched for 6 months slowly re-fog (already in Polish pack) → reason to revisit | M |
| [ ] | **Friend fog overlap** | "You and Maya have both cleared 12% of downtown — 3% overlap" + co-op missions that need both | M |
| [ ] | **Seasonal events** | Homecoming, Halloween (haunted Grand Theatre hunt), Winter "Frost City" palette, Grad Week Wrapped | M |
| [ ] | **Surprise blips** | Random gold blips that exist for 2 hours (location from a seeded daily RNG) worth bonus Rep | S |
| [ ] | **Rank perks** | Each rank unlocks something visible: HUD colours, map filters, emblem, title, radio station | S |
| [ ] | **Push notifications (PWA)** | iOS 16.4+ supports web push for home-screen PWAs: daily job, friend passed you, streak at risk | M |
| [ ] | **Variable rewards on mission pass** | Small chance of a rare "golden photo" frame or bonus Rep roll — the pass screen becomes a slot-machine moment | S |

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

I can build option 3 myself (Blender scripting, glTF export) **if you approve** — it's logged, not started.
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

## 7. Needs from Ryan

| Need | Unblocks | Status |
|---|---|---|
| ~~Mapbox public token~~ | Real-map testing in cloud sessions | ✅ given (kept in git-ignored `.env.local`; add `localhost` + your domains to its URL restrictions) |
| `GEMINI_API_KEY` | Goose rewrites, photo checks, tag screening, radio, TTS | needed |
| Auth0 tenant + `AUTH0_*`, `APP_BASE_URL` | Sign-in, friends, leaderboards, server tags | needed |
| `DATABASE_URL` (Tiger Data) + `npm run db:schema && npm run db:seed` | Accounts, tags (`tag_votes`), new missions in DB | needed |
| Decision: merge `claude/file-editing-offline-9q9lv2` → `main` (or let me push to `main`) | Vercel deploy of all this work | decision |
| Approve 3D model route (§3) | Middlesex College hero model | decision |
| Pick a music route (§4) | Pause-screen music | decision |
| Photos of Middlesex College / UC (any angle) | Option 3 hand-built models, textures | optional |
| LTC GTFS-RT feed URL/key if required | Live buses | check |
