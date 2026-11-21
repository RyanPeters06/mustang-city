# Implementation Plan: Friday-Night Foundation

**Branch**: `main` (spec dir `001-friday-foundation`) | **Date**: 2026-11-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-friday-foundation/spec.md`

## Summary

Turn the existing PWA shell into the real game screen: a single persistent Mapbox Standard map of
London styled into the sunset look, a branded loader, an eased 45°→60° camera mode switch over
Western's campus with neon campus-building extrusions, a first-pass black fog (one GeoJSON polygon
with H3 res-10 holes, device-persisted), a HUD + tab bar + bottom sheet, hidden demo controls,
Auth0 v4 login gated to @uwo.ca, and a Tiger Data schema + idempotent seed. Every integration
degrades gracefully when its env vars are absent.

## Technical Context

**Language/Version**: TypeScript 5, Node 24 (local), Node 22+ on Vercel

**Primary Dependencies**: Next.js 16.4 (App Router, `cacheComponents: true`), React 19.3,
Tailwind v4, motion 14, mapbox-gl 3.35 (Standard style), h3-js 4.5, @auth0/nextjs-auth0 4.x,
postgres (porsager) 3.x

**Storage**: Tiger Data (Postgres + TimescaleDB); device `localStorage` for revealed cells tonight

**Testing**: `npm run build` + `npm run lint`; browser checks in the built-in browser /
Playwright WebKit iPhone profile; manual iPhone home-screen check (Principle VII)

**Target Platform**: iOS Safari 17+ standalone PWA; desktop Chromium/Safari in phone frame

**Project Type**: Single Next.js web app (UI + API routes in one project)

**Performance Goals**: 60 fps map interaction; map usable < 3 s; fog rebuild < 16 ms for ≤ 5k cells

**Constraints**: one map instance; no DOM markers; no `position: fixed`/`100vh` inside the app;
secrets server-only; works with zero env vars (map shows "unavailable" state)

**Scale/Scope**: ~100 hackathon users; London boundary ≈ 30k res-10 cells

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Phone-First PWA | All new UI lives in `.app-root`, absolute-positioned, uses `--safe-*` vars; pointer events; demo panel is the only element outside the frame (by design, laptop-only) | ✅ |
| II. Original IP Only | Names Forest State / Mustang City; original icon; no GTA assets | ✅ |
| III. Secrets Server-Side | Auth0 + DATABASE_URL used only in `lib/auth0.ts`, `proxy.ts`, `scripts/db.mjs`; client gets only `NEXT_PUBLIC_MAPBOX_TOKEN` | ✅ |
| IV. Core Six Always Work | Fog + 3D zoom built tonight; missing env → hidden/unavailable, never crash | ✅ |
| V. Demo Reliability & Perf | Map in ref, created once; fog single polygon via `setData`; circle/symbol layers only; DPR capped at 2; loader until `idle`; demo walk control | ✅ |
| VI. Ship Continuously | build + lint before push; Vercel from `main` | ✅ |
| VII. Simple Over Clever | Module-level stores + `useSyncExternalStore`; no state library; no test framework | ✅ |

Post-design re-check: ✅ no violations; Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-friday-foundation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── http-routes.md
│   ├── demo-controls.md
│   └── db-scripts.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
app/
├── layout.tsx            # shell + phone frame (exists)
├── page.tsx              # renders GameScreen
├── globals.css           # tokens, shell, mapbox attribution styling
components/
├── GameScreen.tsx        # client: map + HUD + tabs + sheet + demo panel
├── map/MapView.tsx       # creates the single Mapbox map, wires layers + camera
├── map/LoadingScreen.tsx
├── Hud.tsx
├── TabBar.tsx
├── Sheet.tsx             # bottom sheet for non-map tabs
├── ProfilePanel.tsx      # auth state
├── LocationPrompt.tsx
└── DemoPanel.tsx         # press D
lib/
├── geo.ts                # London boundary, campus bbox/polygon, mission buildings, demo walk
├── fog.ts                # revealed-cell store, H3 reveal, fog GeoJSON builder, % explored
├── location.ts           # watchPosition with accuracy/speed filtering
├── mapStyle.ts           # Standard config, London-clock light preset, atmosphere
├── auth0.ts              # Auth0Client or null
└── brandIcon.tsx (exists)
proxy.ts                  # Auth0 middleware (no-op when unconfigured)
db/schema.sql, db/seed.sql
scripts/db.mjs            # npm run db:schema / db:seed
auth0/uwo-only-action.js  # paste into Auth0 Actions → Login flow
```

**Structure Decision**: single Next.js project at repo root, matching the brief's suggested layout.

## Complexity Tracking

No violations.
