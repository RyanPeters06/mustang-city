<!--
Sync Impact Report
- Version change: template → 1.0.0 (initial ratification)
- Principles defined: I. Phone-First PWA; II. Original IP Only; III. Secrets Stay Server-Side;
  IV. Core Six Always Work; V. Demo Reliability & Map Performance; VI. Ship Continuously;
  VII. Simple Over Clever
- Added sections: Technology & Platform Constraints; Development Workflow & Quality Gates
- Removed sections: none
- Deferred TODOs: none
-->

# Mustang City Constitution

## Core Principles

### I. Phone-First PWA

- The product is an iPhone home-screen PWA in portrait. Every screen MUST be designed for 375–440 pt
  widths first.
- On wide screens (> 768 px) the same app MUST render inside a centered phone frame. A separate
  desktop layout MUST NOT exist.
- UI inside the app MUST be sized to the app container (`position: absolute`), never
  `position: fixed` or `100vh`. Only the outer shell uses `100dvh`.
- Safe areas MUST come from `--safe-top` / `--safe-bottom` so the phone frame can fake them.
- Interactions MUST work with both touch and mouse (pointer events); tap targets ≥ 44 pt;
  inputs ≥ 16 px.

Rationale: judges see the laptop frame, users see the phone — they must be the same app.

### II. Original IP Only

- Rockstar or GTA names (e.g. Leonida, Vice City), logos, wordmarks, screenshots, art,
  characters and music MUST NOT appear anywhere: code, assets, copy, commits or the demo.
- In-game names: London = "Forest State", Western campus = "Mustang City"; neighbourhoods keep
  real names. The quest-giver is an original goose crime boss.
- Public copy may describe the app only as "GTA 6-inspired".

Rationale: the Devpost page, demo video and social posts are public.

### III. Secrets Stay Server-Side

- All API keys (Auth0, database, Gemini, storage, TTS) MUST live only in server env vars and be
  used only in API routes / server code.
- The browser MUST receive no secret; `NEXT_PUBLIC_MAPBOX_TOKEN` (URL-restricted) is the only
  public key.
- The phone MUST NOT call Gemini, the database or LTC feeds directly.
- `.env*` files (except `.env.example`) MUST NOT be committed.

### IV. Core Six Always Work

- The core features are: black-fog map, 2D→3D zoom into Mustang City, photo missions with
  Gemini verification, @uwo.ca login and profiles, friends, and replay mode.
- No change may leave a core feature broken on `main`. Extended features MUST be additive and
  MUST degrade gracefully (missing env var or failing service → feature hidden, app still runs).
- Work follows the brief's build order; when behind, cut in the brief's cut order. Fog, the 3D
  zoom and photo missions are never cut.

### V. Demo Reliability & Map Performance

- Target 60 fps pan/zoom/tilt on iPhone and in the laptop frame; map usable < 3 s on campus Wi-Fi.
- Exactly one Mapbox map instance, created once and held in a React ref. Map data updates via
  `source.setData()`; GPS fixes stay out of React state.
- Fog is a single GeoJSON polygon (London boundary with explored holes), rebuilt only on new
  reveals, debounced. Thousands of separate hex features MUST NOT be drawn.
- Blips MUST be symbol layers, not DOM markers. Pixel ratio capped at 2.
- Every camera change is eased; no half-drawn map is shown (branded loader until `load`/`idle`).
- Replay mode and hidden demo controls MUST let every demo beat run without live GPS or camera.

### VI. Ship Continuously

- `npm run build` and `npm run lint` MUST pass before every push to `main`.
- `main` auto-deploys to Vercel; each working feature is pushed and checked from the iPhone
  home-screen icon.
- Entire stays enabled so agent sessions are captured for the Entire track.

### VII. Simple Over Clever

- Solo 36-hour build: prefer the simplest working code. No abstraction without a second caller.
- No automated test suite is required; verification is build + lint + browser checks
  (Playwright WebKit iPhone profile, agent-browser faked-GPS walks) + the real iPhone.
- Dependencies are added only when they save real time.

## Technology & Platform Constraints

- Next.js (App Router) + TypeScript + Tailwind v4 + Motion; Mapbox GL JS v3 on Mapbox Standard;
  h3-js (res 10, fallback 9); Auth0 Next.js SDK; Tiger Data (Postgres + TimescaleDB, with
  `location_pings` as the only hypertable); Gemini API; Vercel hosting; HTTPS always.
- Palette tokens: night #140A2E, fog #000000, pink #FF4F8B, orange #FF8A3D, gold #FFC857,
  purple #7B2FF7, teal #2EE6D6.
- iOS specifics from the brief's "iPhone experience" section are requirements, not suggestions.

## Development Workflow & Quality Gates

- Plan with Spec Kit (specify → plan → tasks → implement); `docs/product-brief.md` is the source
  of product truth.
- Before each deploy: build + lint pass; layout checked at 375 and 440 pt widths and in the
  laptop frame; core six smoke-checked.
- Gemini photo checks use the contract `{pass, confidence, reason}`; pass = `pass && confidence
  >= 0.6`.

## Governance

This constitution overrides other practices for this repo. Amendments are made by editing this
file with a version bump: MAJOR for removed/redefined principles, MINOR for new principles or
sections, PATCH for wording. Every plan's Constitution Check MUST verify Principles I–VII;
violations need a written justification in the plan's Complexity Tracking. Runtime guidance for
agents lives in `CLAUDE.md`.

**Version**: 1.0.0 | **Ratified**: 2026-11-20 | **Last Amended**: 2026-11-20
