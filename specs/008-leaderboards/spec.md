# Feature Specification: Leaderboards

**Created**: 2026-11-21 · **Status**: Done (SQL needs a configured DB to exercise) · **Branch**: `main`

**Input**: Backlog — weekly + all-time, filter friends / faculty / all Western, ranked by Rep and % explored (brief → Progression).

## User Scenarios
- **US1 (P1)** Crew tab → Leaderboard: top 50 with rank, emblem, name, faculty and score; the player's row highlighted;
  "You're #N" when outside the top 50.
- **US2 (P1)** Filters: This week / All time · Western / Faculty / Crew · Rep / %.
- **US3 (P2)** Without accounts: a labelled demo board (demo crew + you, all-time numbers).

## Requirements
- FR-001 `GET /api/leaderboard?period&scope&metric` (signed-in + DB); top 50 plus the caller's own row.
- FR-002 All-time uses `users.rep` / `users.explored_cells` (kept current by `/api/me` sync).
- FR-003 Weekly (London week, Monday start) = cells first revealed this week ÷ 7 + mission Rep completed this week.
- FR-004 Faculty scope requires the caller's faculty; friends scope = accepted friends + self.
- FR-005 Ties broken by account age (earlier first).

## Notes
- Weekly cell counts use `revealed_cells.first_seen_at`, which is the sync time for cells explored offline.
- A continuous aggregate for weekly Rep (brief) can replace the CTE once ping volume justifies it; `user_daily_cells`
  already exists on `location_pings`.
