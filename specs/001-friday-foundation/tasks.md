---
description: "Task list for the Friday-night foundation"
---

# Tasks: Friday-Night Foundation

**Input**: Design documents from `specs/001-friday-foundation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested (Constitution VII) — verification is build + lint + browser checks per quickstart.md.

## Format: `[ID] [P?] [Story] Description`

Paths are relative to the repo root (single Next.js project).

## Phase 1: Setup

- [X] T001 Install runtime deps `@auth0/nextjs-auth0` and `postgres`; add `db:schema` / `db:seed` scripts in package.json
- [X] T002 [P] Import Mapbox CSS and add attribution/canvas styling + sheet/HUD utility styles in app/globals.css

## Phase 2: Foundational (blocks all stories)

- [X] T003 [P] Create geography constants (London boundary polygon, campus bbox + polygon, Middlesex College polygon, campus centre, demo walk path) in lib/geo.ts
- [X] T004 [P] Create Standard basemap config, London-clock light preset, atmosphere fog settings in lib/mapStyle.ts
- [X] T005 Create GameScreen client shell holding tab state, mounting map, HUD, tab bar and sheet in components/GameScreen.tsx and render it from app/page.tsx

**Checkpoint**: shell renders inside the phone frame.

## Phase 3: User Story 1 — Forest State under fog (P1) 🎯 MVP

**Goal**: branded loader → tilted sunset map with black fog, HUD, tab bar; reveals clear fog.
**Independent test**: quickstart scenarios 1, 2, 4, 5.

- [X] T006 [P] [US1] Branded loading screen with fade-out and "map unavailable" variant in components/map/LoadingScreen.tsx
- [X] T007 [P] [US1] Revealed-cell store (Set, localStorage `mc.cells.v1`, default campus reveal, subscribe/snapshot), `revealAt(lat,lng)` with ring-1 and London-boundary filter, fog GeoJSON builder (single polygon + holes, edge lines), % explored, Rep/rank per data-model.md "Client-side" in lib/fog.ts
- [X] T008 [P] [US1] Location watcher with accuracy (>50 m) and speed (>45 m/s) filtering, start/stop API in lib/location.ts
- [X] T009 [US1] MapView: single map instance in a ref (dynamic import mapbox-gl, DPR ≤ 2, no default controls, Standard config from lib/mapStyle.ts), fog fill + blurred edge line layers (slot top), player dot circle layer, debounced `setData` on store changes, ResizeObserver → `map.resize()`, `onReady` after first `idle` in components/map/MapView.tsx
- [X] T010 [P] [US1] HUD (Rep, rank, % explored) reading lib/fog.ts via useSyncExternalStore, inside safe area in components/Hud.tsx
- [X] T011 [P] [US1] Bottom tab bar (Map, Missions, Crew, Profile), ≥44 pt targets, safe-area padding in components/TabBar.tsx
- [X] T012 [P] [US1] Bottom sheet (Motion spring, drag-to-dismiss with pointer events) for non-map tabs with placeholders in components/Sheet.tsx
- [X] T013 [P] [US1] Location explainer pill that starts lib/location.ts on tap and shows denied state in components/LocationPrompt.tsx
- [X] T014 [US1] Demo panel (press D, outside frame) per contracts/demo-controls.md: walk campus, reveal here, fly to campus/city, reset fog in components/DemoPanel.tsx

**Checkpoint**: MVP demo — fogged sunset map clears along the demo walk.

## Phase 4: User Story 2 — Zoom into Mustang City (P1)

**Goal**: eased 45°→60° switch over campus with neon buildings.
**Independent test**: quickstart scenario 3.

- [X] T015 [US2] Add streets-v8 source + campus building fill-extrusion (within campus polygon, neon gradient, emissive, opacity fade z15→15.5) and Middlesex gold glow layer in components/map/MapView.tsx
- [X] T016 [US2] Camera mode switch on `moveend` (campus if zoom ≥ 15 and centre in bbox) with eased pitch 60/45, reduced-motion aware, exposed `flyToCampus` / `flyToCity` in components/map/MapView.tsx

## Phase 5: User Story 3 — Sign in with Western account (P2)

**Goal**: @uwo.ca-only login, profile identity, sign out, graceful unavailable state.
**Independent test**: quickstart scenario 6 (and 1 for unconfigured).

- [X] T017 [P] [US3] Auth0Client-or-null with `onCallback` @uwo.ca re-check redirecting to logout `?denied=uwo` in lib/auth0.ts
- [X] T018 [US3] Auth0 proxy (pass-through when unconfigured) in proxy.ts
- [X] T019 [P] [US3] Login Action rejecting non-@uwo.ca emails in auth0/uwo-only-action.js
- [X] T020 [US3] Profile panel fetching `/auth/profile` (signed-in / signed-out / unavailable / denied states), sign-in/out links in components/ProfilePanel.tsx and wire into components/GameScreen.tsx

## Phase 6: User Story 4 — Game data foundation (P2)

**Goal**: one-command schema + idempotent seed.
**Independent test**: quickstart scenario 7.

- [X] T021 [P] [US4] Schema for every table in data-model.md (users.email @uwo.ca check, missions.type/category enums, missions.slug unique, friendships no-self, mission_completions unique pair), location_pings hypertable, `user_daily_cells` continuous aggregate + refresh policy in db/schema.sql
- [X] T022 [P] [US4] Seed 6 verified landmark missions (data-model.md missions.category/brief/year/source_url), starter missions (to 10–15 total) and 6 badges (badges.code unique) with ON CONFLICT DO NOTHING in db/seed.sql
- [X] T023 [US4] Runner that executes a SQL file against DATABASE_URL with clear error when missing in scripts/db.mjs

## Phase 7: Polish

- [X] T024 Update .env.example, README and CLAUDE.md with new env names, Auth0 setup and db commands
- [X] T025 Run `npm run lint` and `npm run build`; browser-check quickstart scenarios 1, 2, 4, 5 at 375/440 widths and laptop frame

## Dependencies

- Setup → Foundational → US1 → US2 (same file MapView) ; US3 and US4 depend only on Setup and can run in parallel with US1/US2.
- Within US1: T007/T008/T006/T010–T013 parallel; T009 needs T003, T004, T007; T014 needs T009.

## Parallel examples

- US1: T006, T007, T008, T010, T011, T012, T013 together.
- US3 + US4: T017, T019, T021, T022 together.

## Implementation strategy

MVP = Phases 1–3 (fogged map + demo walk) → US2 (wow moment) → deploy → US3 → US4 → polish.
