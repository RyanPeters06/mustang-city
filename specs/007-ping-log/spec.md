# Feature Specification: Server Ping Log

**Created**: 2026-11-21 · **Status**: Done (pending a configured DB to exercise end to end) · **Branch**: `main`

**Input**: Backlog — write live GPS fixes to the `location_pings` hypertable when signed in (batched), so replays and
Wrapped survive device changes and `user_daily_cells` (continuous aggregate) has data.

## Requirements
- FR-001 Only real GPS fixes (`source: "gps"`) are logged; never demo or replay fixes.
- FR-002 Client buffers fixes and flushes every 30 s, at 25 fixes, or on page hide (keepalive); max buffer 2,000.
- FR-003 `POST /api/pings` (signed-in @uwo.ca + DB) validates (last 7 days, sane lat/lng/accuracy), caps 500 per batch,
  computes the H3 res-11 cell server-side, inserts with one `unnest` statement.
- FR-004 503 (accounts off) or 401 (signed out) → client stops logging for the session; device replay is unaffected.
- FR-005 409 (profile not synced yet) / network errors → keep buffer, retry next tick.

## Verification
- Without DB: endpoint returns `503 db-unavailable`; client sends nothing while signed out/unavailable (checked in browser).
- With DB (needs Ryan's `DATABASE_URL` + Auth0): a signed-in walk should appear in `location_pings`.
