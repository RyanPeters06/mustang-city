# Data Model: Friday-Night Foundation

Full SQL lives in `db/schema.sql`. Tables follow the brief's data model; additions are marked ➕.

| Table | Key fields | Constraints / notes |
|---|---|---|
| users | id uuid PK, auth0_id unique, email unique, display_name, faculty, rep int ≥0, rank text, created_at | `email LIKE '%@uwo.ca'` check |
| location_pings | user_id → users, ts, lat, lng, accuracy_m, h3_cell | **Hypertable** on ts; index (user_id, ts desc) |
| revealed_cells | user_id, h3_cell, first_seen_at, last_visited_at | PK (user_id, h3_cell) |
| neighbourhoods | id, name unique, polygon jsonb (GeoJSON), h3_cells text[] | campus zones included |
| missions | id, ➕slug unique, title, briefing, type enum(photo, checkin, bus, heist), lat, lng, radius_m (default 75), criteria, rep_reward, creator_id → users null, is_official, active, category null enum(history, film_tv, viral), brief, year, source_url | landmark fields nullable |
| mission_completions | id, mission_id, user_id, photo_url, lat, lng, gemini_pass, gemini_reason, completed_at | unique (mission_id, user_id) |
| heist_attempts | id, mission_id, started_at, member_ids uuid[], photo_url, status enum(open, complete, expired) | |
| friendships | user_id, friend_id, status enum(pending, accepted), created_at | PK (user_id, friend_id), no self |
| crews | id, name, member_ids uuid[] | |
| tags | id, user_id, h3_cell, lat, lng, note, photo_url, votes, created_at | index h3_cell |
| collectibles | id, name, lat, lng, lore_text | |
| collectible_finds | user_id, collectible_id, found_at | PK (user_id, collectible_id) |
| badges | id, code unique, name, description | seeded |
| user_badges | user_id, badge_id, earned_at | PK (user_id, badge_id) |
| mission_votes | mission_id, user_id, value smallint ±1 | PK (mission_id, user_id) |
| rides | id, user_id, route_id, start_stop, end_stop, started_at, ended_at | |
| district_control | neighbourhood_id PK, faculty, rep_total, updated_at | |

Continuous aggregate `user_daily_cells(bucket, user_id, h3_cell, pings)` over `location_pings`
with a refresh policy every 15 min.

## Client-side (tonight)

- **Revealed cell set**: `Set<string>` of H3 res-10 ids, persisted to `localStorage["mc.cells.v1"]`
  as a JSON array; default seed = campus-centre cell + ring 2.
- **Rank** derived from Rep: Frosh 0, Local 1 000, Made 5 000, Legend of Forest State 15 000.
  Tonight Rep = 1 per revealed cell (brief's "clear a new fog cell").
