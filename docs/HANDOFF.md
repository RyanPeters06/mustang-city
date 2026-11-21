# Handoff: project state as of Nov 21, 2026

Read this first in a new chat, then `CLAUDE.md`, `docs/BACKLOG.md` and `docs/IDEAS.md`. It records everything
decided and built across the long build session, so no context is lost.

## Where things stand
- **Branch:** `claude/file-editing-offline-9q9lv2` holds all work. PR #1 (everything up to the 3D campus) was merged
  into `main`. Everything after it is on the branch only, and needs a **new PR** to reach `main` (Vercel deploys from
  `main`). That covers the polish passes, the explored campus, day/night models, onboarding, the legend and these docs.
- **Ryan's laptop changes are not on GitHub yet.** Suggested flow: push them to a `laptop-work` branch, then merge it
  with this branch and resolve conflicts. Both branches touch the UI.
- **Backlog:** every item is done. The remaining work is the **UI polish plan** in `docs/BACKLOG.md` (typography,
  motion, accessibility, cover art) and the ideas awaiting approval in `docs/IDEAS.md` (§0 ranks them by hackathon win odds).

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
- **Database:** keep Tiger Data (TimescaleDB hypertable + continuous aggregate, MLH prize). Supabase is recommended as
  an add-on for Realtime and Storage only, because Supabase dropped TimescaleDB on Postgres 17 (`docs/SETUP_KEYS.md`).
- **Turf** uses cleared cells per faculty, not Rep, because cells are what's geographic.
- **Design direction:** a clean, soft, premium mobile app. GTA 6 flavour comes from the art direction (postcards, sunset
  palette, full-bleed loading art, establishing-shot captions), not from hard or polygonal shapes.
- Push only to the `claude/...` branch unless Ryan says otherwise. Force-push was blocked once, so merge instead.

## Needs from Ryan (also `docs/IDEAS.md` §7 and `docs/SETUP_KEYS.md`)
- **Keys:** `GEMINI_API_KEY`, the Auth0 settings and `DATABASE_URL`, then run `npm run db:schema && npm run db:seed`.
  The schema has new tables and columns since the last seed: `tag_votes`, `missions.created_at` and the heist index.
- **Deploy:** a new PR from this branch into `main`.
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
