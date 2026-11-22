# Handoff: project state as of Nov 22, 2026

Read this first in a new chat, then `CLAUDE.md`, `docs/BACKLOG.md` and `docs/IDEAS.md`. It records everything
decided and built across the build sessions, so no context is lost.

## Where things stand
- **Branch:** everything is on `main`; Vercel deploys `main` to **https://www.mustangcity.rodeo** (GoDaddy domain;
  the bare domain redirects to www).
- **Live keys on Vercel:** Mapbox, Gemini (working: briefings, radio, TTS) and Auth0 (redirect works, but the Auth0 app
  still needs `https://www.mustangcity.rodeo/auth/callback` in Allowed Callback URLs). **No database yet.**
- **Backlog:** the Nov 22 "approve everything" queue in `docs/BACKLOG.md` is built (see the list below).

## The core loop (Nov 22)
- **Regions** (`lib/regions.ts`): London = 42 planning districts. Each has 4 core quests built from real places
  (`lib/data/places.json`, OpenStreetMap via `scripts/places-build.mjs`): set foot, explore N blocks, check in at a
  local café/restaurant/shop, and a signature quest (Goose job, collectible, landmark or park). **3 of 4 claims the
  region**: its whole fog lifts (claimed polygons are unioned into the fog holes, not stored as cells, so no Rep/%
  inflation), +150 Rep. HUD headline is **Regions n/42**.
- **Side quests** (`lib/sideQuests.ts`): 3 light quests per region (photo op, bus ride in at a real LTC stop, night
  shift, trivia, food crawl, crew meet-up, tag), +40 Rep, pinned to real spots. Region quest blips on the map appear
  only from z12.3 (no clutter at city zoom).
- **Dailies + streaks** (`lib/daily.ts`): 3 quests a day (seeded by date), +20 each, +50 for all three; one a day keeps
  the streak (flame on the HUD). **Surprise blips** (`lib/surprise.ts`): 3 gold stars a day, +75 Rep + loot.
- **Competition:** regions leaderboard (week/all, Western/faculty/crew) + **faculty war** (each region held by the
  faculty with the most claimers). Server: `region_claims` table, `/api/me` syncs claims + streak,
  `/api/leaderboard?metric=regions` returns faculty standings. Labelled demo crew until the DB is connected.
- **Stash & carry** (`lib/loot.ts`): quests drop loot into a 6-slot bag (+1 per rank); it only counts once banked by
  walking onto campus (Mustang City).
- **Feel:** wanted-level stars (`lib/wanted.ts`), golden-job variable rewards (18%, 1.5× Rep), The Goose calls you
  (`/api/goose-call`, Gemini TTS) on first entering an unclaimed region, procedural synthwave soundtrack
  (`lib/music.ts`), coach marks (onboarding v2) and near-miss nudges, photo mode, `/stage` big-screen mirror.
- **Title screen:** layered cover (`lib/data/coverLayers.json` from `scripts/build-cover.mjs`), compositor-driven
  camera (`components/intro/CoverCamera.tsx`), press any key / tap anywhere every load, panels burst, dive into the logo.

## Demo panel (press D) cheat sheet
Every region quest and side quest gets **Go there (demo)**; plus: The Goose calls, music on/off, loot drop, bank bag,
teleport to a surprise, wanted level +1 star, play MISSION PASSED / GOLDEN pass, replay intro, walk campus, weather.

## What's built (one spec per feature in `specs/`)
| Spec | Feature |
|---|---|
| 001–009 | Foundation, missions/profiles, friends + building cards, replay, rank + badges, neighbourhoods, ping log, leaderboards, time-of-day lighting |
| 010 | The Goose quest-giver: original SVG portrait; Gemini re-voices briefings with a fact guard |
| 011 | Geo-pinned tags: server gate on revealed cells; upvotes give +10 Rep; local/demo mode |
| 012 | 11 sourced London landmark missions, map-menu overview, region tap raise, cinematic intro, brand emblem |
| 013 | Forest FM radio: facts-only scripts, Gemini TTS or the browser's speech voice, captions |
| 014 | Graduation Wrapped: story slides, fog timelapse, real stats, share card |
| 015 | Live LTC buses (GTFS + GTFS-RT), next arrivals, ride detection, Every Route badge |
| 016 | Faculty turf + 3-player heists |
| 017 | Polish pack: collectibles, radar, posters, fog decay, weather, student-written missions |
| 018 | Class Run: private schedule, next-class waypoints, on-time Rep |
| 019 | Hand-built 3D campus models (glTF via script) |
| 020 | Mustang City always explored inside Western's real boundary, sharp border, all 160 campus buildings modelled |

UI polish passes (commits after 019) changed the following:
- **Look:** soft rounded glass with no cut corners, sunset pill buttons, and the golden-hour palette.
- **Fog:** Chaikin-smoothed edges with a feathered rim.
- **Map:** one control stack, building framing on tap, and a postcard loading screen built from renders of our own campus.
- **Models and art:** day/night model variants and the soft Wrapped art.
- **New players:** onboarding cards and a map legend with layer toggles.

## Decisions to keep
- **Original IP only:** no GTA/Rockstar names, logos, fonts or art. Public copy may only say "GTA 6-inspired". No parody
  of the GTA logo; the cover-art collage uses our own wordmark (`docs/COVER_ART.md`).
- **Accuracy rule:** landmark, collectible and radio facts come from stored, sourced text. Gemini may restyle text but
  never adds facts, and numbers are guard-checked.
- **Mustang City cells** are always revealed but never count toward Rep, % explored, districts, leaderboards or sync.
- **Fog decay** is a haze only: explored ground never un-explores.
- **Privacy:** no live location sharing; the Class Run schedule stays on the device; loot challenges (an idea, not built)
  must be opt-in with coarse areas only.
- **Database (changed Nov 22):** Supabase (plain Postgres) replaced Tiger Data, which didn't really fit. The hypertable is now
  a plain indexed table and the continuous aggregate a plain view. Not entering the Tiger Data prize (`docs/SETUP_KEYS.md`).
- **Turf** uses cleared cells per faculty, not Rep, because cells are what's geographic.
- **Design direction:** a clean, soft, premium mobile app. GTA 6 flavour comes from the art direction (postcards, sunset
  palette, full-bleed loading art, establishing-shot captions), not from hard or polygonal shapes.
- Push only to the `claude/...` branch unless Ryan says otherwise. Force-push was blocked once, so merge instead.

## Needs from Ryan (also `docs/IDEAS.md` §7 and `docs/SETUP_KEYS.md`)
- **Supabase `DATABASE_URL`** (transaction pooler, port 6543, with the DB password), then `npm run db:schema && npm run db:seed`
  and add it to Vercel. Unlocks accounts, real leaderboards, faculty war, tags, heists.
- **Auth0:** add the www callback/logout/web-origin URLs above. The @uwo.ca-only Action is optional for the demo.
- **Optional:** comic-panel art and icon (prompts in `docs/COVER_ART.md`).
- **Checks on the deployed site:** live LTC buses (the realtime host reset connections from the cloud build machine)
  and Open-Meteo weather (it returned 429 to the cloud machine).

## Running locally
- `.env.local` needs `NEXT_PUBLIC_MAPBOX_TOKEN` (a public `pk.` token; allow localhost in its URL restrictions).
  `LTC_FIXTURE=1` simulates buses in dev only.
- `npm run dev`. Press **D** for demo controls: walk campus, reveal here, light presets, weather, fog ageing, sample turf,
  demo heist crew, replay intro.
- **Regenerate data:**
  - `npm run gtfs:build <unzipped LTC GTFS dir>` → `lib/data/ltc.json`
  - `npm run models:extract <dir of Mapbox Streets z15 tiles>` → `scripts/models/campus-all.json`
  - `npm run models:build` → `public/models/*.glb` (night and `-day` variants) + `lib/data/campusModels.json`
- **Cloud sessions:** the `mustang-city` cloud environment allows `api.mapbox.com`, `events.mapbox.com`,
  `gtfs.ltconline.ca`, `www.londontransit.ca` and `api.open-meteo.com`.

## Gotchas learned the hard way
- **Mapbox glTF:** vertex buffers must not be interleaved (`VertexLayout.SEPARATE`), indices must be uint16, and
  `addModel` needs absolute URLs. Axes: +X east, +Y up, +Z south. A `clip` layer needs `clip-layer-scope: ["basemap"]`,
  or it hides our own models whose anchor sits inside the clip polygon.
- **Material glow** ignores the layer's `model-emissive-strength`. That's why there are separate `-day` model files.
- **Next 16 with `cacheComponents`:** a route handler that doesn't read the request gets prerendered. Call `await connection()`.
- **The dev server sometimes serves stale CSS** after edits in this container. Restart `next dev` if styles don't change.
- **Tile-split buildings:** Mapbox vector tiles split buildings at tile edges. Footprint matching must test vertex
  overlap both ways (see `replacedByModel` in `MapView.tsx`).
- **Headless browser screenshots:** use `--use-gl=angle --use-angle=swiftshader`. Run the scripts from the scratchpad,
  not the repo root, or the screenshots land in git.

## Ideas logged but not built (see `docs/IDEAS.md`)
- **Ranked list (§0):** Devpost trailer, comic-panel cover intro, live big-screen mirror, "wanted level" stars, The Goose
  calls you, the stash and carry inventory (Mustang City as the stash), loot challenges as a London trivia duel, pause
  music, photo mode and more.
- **3D models (§3):** phone photogrammetry is the upgrade path to photo-real facades.
- **Pause music (§4):** procedural, licensed or AI-generated routes.
