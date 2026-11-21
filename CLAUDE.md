# Mustang City

GTA 6-inspired fog-of-war exploration PWA for Western students (Hack Western 13, solo build).
The full product brief is in [docs/product-brief.md](docs/product-brief.md) — read it before planning features.

## Ground rules
- Mobile-first PWA for iPhone home-screen use. On wide screens the same app renders inside a centered phone frame (`.shell` / `.app-root` in `app/globals.css`) — never a separate desktop layout.
- Inside the app, size UI to the app container (`position: absolute`), never `position: fixed` or `100vh`. Only the outer shell uses `100dvh`.
- Never use Rockstar/GTA names, logos, art or music. London = "Forest State", Western campus = "Mustang City".
- All API keys stay server-side (Vercel env vars). The browser only gets `NEXT_PUBLIC_MAPBOX_TOKEN`.
- Core six features (fog map, 3D campus zoom, photo missions, login/profiles, friends, replay) must keep working; extended features must not break them.
- Build order and cut list are in the brief's "Build plan" section.

## Stack
Next.js (App Router) + TypeScript + Tailwind v4, Motion, Mapbox GL JS (Standard style), h3-js, Auth0, Tiger Data (Postgres/TimescaleDB), Gemini API, Vercel.

## Code map
- `components/GameScreen.tsx` — the one screen: map + HUD + tab bar + sheet + demo panel (press D).
- `components/map/MapView.tsx` — the single Mapbox instance; fog/player/campus layers; 45°↔60° camera switch.
- `lib/fog.ts` — revealed H3 res-11 cells (localStorage), `revealAround` (100 m radius), fog polygon builder, % explored.
- `lib/location.ts` — GPS watcher; `acceptFix` is the shared path for GPS and demo walks.
- `lib/auth0.ts` + `proxy.ts` — Auth0 v4 (null/no-op when env missing); `auth0/uwo-only-action.js` for the dashboard.
- `db/schema.sql`, `db/seed.sql`, `npm run db:schema|db:seed`.
- Specs live in `specs/NNN-*/` (Spec Kit).

## Workflow
- Planning: Spec Kit (`/speckit-constitution` → `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`).
- Design: `/impeccable`, frontend-design, web-design-guidelines skills.
- Testing: Playwright MCP (WebKit, iPhone 15) for layout; agent-browser for faked-GPS walks.
- Entire is enabled — session checkpoints are pushed with the repo.
- `npm run build` must pass before every push; Vercel deploys from `main`.
