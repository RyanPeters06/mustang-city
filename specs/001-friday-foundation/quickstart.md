# Quickstart: validate the Friday-night foundation

## Prereqs
- `.env.local` from `.env.example` with at least `NEXT_PUBLIC_MAPBOX_TOKEN`.
- Optional: Auth0 app (callback `<base>/auth/callback`, logout `<base>`, `<base>/?denied=uwo`) with
  `auth0/uwo-only-action.js` added to the Login flow; Tiger Data `DATABASE_URL`.

## Scenarios
1. **Zero config**: unset all env vars, `npm run build && npm start` → app loads, map area shows
   "Map unavailable" card, tabs work, Profile says sign-in unavailable. (FR-017)
2. **Map + loader**: with token, open `/` → branded loader, then tilted sunset map with black fog
   and a clear patch on campus; no POI/transit labels; no default controls. (US1)
3. **3D zoom**: scroll into campus past z15 → eases to ~60°, neon campus buildings, Middlesex glows;
   zoom out → back to ~45°. (US2)
4. **Fog reveal**: press D → Walk campus → fog clears along the path, HUD % rises; reload → still
   cleared. (FR-007–FR-012)
5. **Phone frame**: window > 768 px shows framed phone; < 768 px fills the viewport; resize keeps map
   undistorted. (FR-002)
6. **Auth**: Profile → Sign in with @uwo.ca → identity shown; non-@uwo.ca → refused message. (US3)
7. **DB**: `npm run db:schema && npm run db:seed` twice → no errors, seed counts unchanged. (US4)
8. **Gates**: `npm run lint && npm run build` pass.
