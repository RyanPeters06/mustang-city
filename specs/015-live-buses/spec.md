# Feature Specification: Live Buses + Route Collection

**Created**: 2026-11-21 · **Status**: Done (live feed unverified from the build container) · **Branch**: `claude/file-editing-offline-9q9lv2`

**Input**: Backlog — LTC GTFS static + GTFS-RT in an API route, buses animate on the map, mission cards show next
arrival; ride detection; "Every Route" progress. *Done when:* live buses move (or cached last-good feed with a
"delayed" label).

## Data (London Transit Commission open data, londontransit.ca/open-data)
- Static: `google_transit.zip` → `npm run gtfs:build <dir>` → `lib/data/ltc.json` (38 routes, one simplified shape per
  route+direction, 111 stops within 450 m of a mission; 76 KB). Feed version 2026 November.
- Realtime (server only, `lib/ltc.ts`): `gtfs.ltconline.ca/Vehicle/VehiclePositions.pb`, `/TripUpdate/TripUpdates.pb`,
  decoded with `gtfs-realtime-bindings`; 15 s freshness; last good copy kept.

## Behaviour
- `GET /api/buses` → `{ vehicles, status: live | delayed | unavailable | simulated, ageSec }`.
- `GET /api/arrivals?stops=` → next arrivals at up to 3 stops.
- Map: route lines in LTC colours (z ≥ 12.5), bus dots with route numbers (z ≥ 11), positions glide over 2.5 s
  between polls (15 s, paused when the app is hidden). Status chip says Live / Delayed (age) / Offline / Simulated.
- Mission card: "Route N in X min · stop · distance" from TripUpdates; honest fallback text when unavailable.
- Ride detection (on device): > 14 km/h for 90 s within 40 m of one route shape → ride logged (once per route per
  30 min), toast "Ride logged · Every Route n/38". Feeds badges **Route 6 Regular** (same route on 10 days) and
  **Every Route**. Bus missions unlock check-in only after a ride in the last 45 min.
- `LTC_FIXTURE=1` (dev only, never in production) simulates buses along real shapes for demos — labelled "Simulated".

## Verification
- GTFS-RT decode round-trip test (encode sample FeedMessage → decode → fields).
- Browser (real map): simulated buses + route lines downtown; mission card "Route 2 in 4 min · Richmond at King SB";
  GPS moved along route 02 at ~30 km/h → "Ride logged" after 128 s, badge progress updated.
- Real feed: `gtfs.ltconline.ca` reset TLS from the cloud container (static host works) — confirm on Vercel/phone.
