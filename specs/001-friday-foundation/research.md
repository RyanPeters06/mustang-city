# Research: Friday-Night Foundation

## R1. Base map styling on Mapbox Standard
- **Decision**: `style: mapbox://styles/mapbox/standard` with `config.basemap` set at creation:
  `lightPreset` from London clock, `showPointOfInterestLabels/showTransitLabels/showPedestrianRoads:
  false`, colour overrides (water → purple, motorways → pink, trunks → orange). Atmosphere via
  `map.setFog()` with pink/orange horizon and night-purple space colour.
- **Rationale**: Standard already ships lit 3D buildings, trees and landmarks; config keeps one style.
- **Alternatives**: custom Studio style (slower to iterate, needs account work); LUT theme
  (deferred to polish — needs an authored LUT image).

## R2. Campus 3D highlight
- **Decision**: add a `mapbox-streets-v8` vector source and a `fill-extrusion` layer on the
  `building` source-layer, filtered with `within` the campus polygon, neon gradient colours,
  `fill-extrusion-emissive-strength` so it glows under night lighting, opacity fading in z15→15.5.
  A second layer filtered `within` mission-building polygons (Middlesex College) glows gold.
- **Rationale**: deterministic, no reliance on feature ids or featureset APIs.
- **Alternatives**: Standard `buildings` featureset + feature-state (needs stable ids per building).

## R3. Camera mode switch
- **Decision**: on `moveend`, compute mode = `campus` if `zoom ≥ 15` and centre inside campus bbox,
  else `city`. On mode change only, `easeTo({ pitch: 60 | 45, duration: 900 })`. User-driven pitch
  inside a mode is left alone. Reduced motion → duration 0.
- **Rationale**: avoids fighting the user's gestures and avoids re-entrant `moveend` loops.

## R4. Fog geometry
- **Decision**: one `FeatureCollection` with a MultiPolygon: polygon 1 = London boundary outer ring
  with each revealed region's outer loop as a hole; plus each revealed region's inner loops (unrevealed
  islands) as extra fog polygons. Built from `cellsToMultiPolygon(cells, true)`. Soft edge = black
  line layer with `line-blur` along revealed outer loops. Fog rebuild debounced 150 ms.
- **Rationale**: Principle V; one feature regardless of reveal count.
- **Alternatives**: one feature per hex (thousands of features, grid look).

## R5. % explored
- **Decision**: denominator = `polygonToCells(LONDON_BOUNDARY, 10).length`, computed once lazily
  (≈30k cells, ~50 ms) and used as a Set to reject reveals outside London.
- **Rationale**: exact under the same grid used for reveal.

## R6. Location filtering
- **Decision**: `watchPosition({ enableHighAccuracy: true, maximumAge: 2000 })`; drop fixes with
  `accuracy > 50` m or implied speed > 45 m/s vs last accepted fix. Started only after the user taps
  the location prompt (iOS permission etiquette). Fixes go to the fog store and the player-dot source,
  never React state.

## R7. Auth0 v4 on Next 16
- **Decision**: `lib/auth0.ts` exports `Auth0Client | null` (null when any of `AUTH0_DOMAIN`,
  `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` is missing). `proxy.ts` calls
  `auth0.middleware()` or passes through. `onCallback` re-checks email domain and sends non-@uwo.ca
  sessions to `/auth/logout?returnTo=/?denied=uwo`. The primary gate is an Auth0 Login Action
  (`auth0/uwo-only-action.js`). Client reads `/auth/profile` (200 user / 401|204 signed out /
  other = unavailable) — no provider needed, layout stays static under `cacheComponents`.
- **Alternatives**: `getSession()` in layout (forces dynamic rendering + Suspense).

## R8. Database access
- **Decision**: plain SQL files run by `scripts/db.mjs` using `postgres` (porsager); seed uses
  `ON CONFLICT DO NOTHING` on natural keys (`missions.slug`, `badges.code`).
- **Continuous aggregate**: `user_daily_cells` over `location_pings` grouped by
  `time_bucket('1 day', ts), user_id, h3_cell`; explored count = `count(DISTINCT h3_cell)` over the view
  (caggs can't contain `DISTINCT` aggregates directly).

## R9. London boundary
- **Decision**: hand-simplified ~12-vertex polygon around the City of London's municipal extent.
  Open question in the brief (open data vs hand-drawn) stays open for neighbourhoods.
