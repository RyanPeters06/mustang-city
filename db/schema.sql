-- Mustang City schema (Tiger Data: Postgres + TimescaleDB). Idempotent: safe to re-run.
CREATE EXTENSION IF NOT EXISTS timescaledb;

DO $$ BEGIN
  CREATE TYPE mission_type AS ENUM ('photo', 'checkin', 'bus', 'heist');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE mission_category AS ENUM ('history', 'film_tv', 'viral');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE friendship_status AS ENUM ('pending', 'accepted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE heist_status AS ENUM ('open', 'complete', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_id      text NOT NULL UNIQUE,
  email         text NOT NULL UNIQUE CHECK (lower(email) LIKE '%@uwo.ca'),
  display_name  text NOT NULL,
  faculty       text,
  rep           integer NOT NULL DEFAULT 0 CHECK (rep >= 0),
  rank          text NOT NULL DEFAULT 'Frosh',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Only hypertable: raw GPS fixes. Feeds reveal, replay and Wrapped.
CREATE TABLE IF NOT EXISTS location_pings (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ts          timestamptz NOT NULL,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  accuracy_m  real,
  h3_cell     text NOT NULL
);
SELECT create_hypertable('location_pings', by_range('ts', INTERVAL '1 day'), if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS location_pings_user_ts ON location_pings (user_id, ts DESC);

CREATE TABLE IF NOT EXISTS revealed_cells (
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  h3_cell          text NOT NULL,
  first_seen_at    timestamptz NOT NULL DEFAULT now(),
  last_visited_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, h3_cell)
);

CREATE TABLE IF NOT EXISTS neighbourhoods (
  id        serial PRIMARY KEY,
  name      text NOT NULL UNIQUE,
  polygon   jsonb NOT NULL,          -- GeoJSON Polygon
  h3_cells  text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS missions (
  id           serial PRIMARY KEY,
  slug         text NOT NULL UNIQUE,
  title        text NOT NULL,
  briefing     text NOT NULL,
  type         mission_type NOT NULL,
  lat          double precision NOT NULL,
  lng          double precision NOT NULL,
  radius_m     integer NOT NULL DEFAULT 75 CHECK (radius_m > 0),
  criteria     text NOT NULL,        -- plain-language check sent to Gemini
  rep_reward   integer NOT NULL DEFAULT 100 CHECK (rep_reward >= 0),
  creator_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  is_official  boolean NOT NULL DEFAULT false,
  active       boolean NOT NULL DEFAULT true,
  -- landmark missions
  category     mission_category,
  brief        text,
  year         integer,
  source_url   text
);

CREATE TABLE IF NOT EXISTS mission_completions (
  id             serial PRIMARY KEY,
  mission_id     integer NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url      text,
  lat            double precision,
  lng            double precision,
  gemini_pass    boolean,
  gemini_reason  text,
  completed_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mission_id, user_id)
);
CREATE INDEX IF NOT EXISTS mission_completions_user ON mission_completions (user_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS heist_attempts (
  id          serial PRIMARY KEY,
  mission_id  integer NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  started_at  timestamptz NOT NULL DEFAULT now(),
  member_ids  uuid[] NOT NULL DEFAULT '{}',
  photo_url   text,
  status      heist_status NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS friendships (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      friendship_status NOT NULL DEFAULT 'pending',
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

CREATE TABLE IF NOT EXISTS crews (
  id          serial PRIMARY KEY,
  name        text NOT NULL,
  member_ids  uuid[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS tags (
  id          serial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  h3_cell     text NOT NULL,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  note        text,
  photo_url   text,
  votes       integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tags_h3_cell ON tags (h3_cell);

CREATE TABLE IF NOT EXISTS collectibles (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  lat        double precision NOT NULL,
  lng        double precision NOT NULL,
  lore_text  text
);

CREATE TABLE IF NOT EXISTS collectible_finds (
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collectible_id  integer NOT NULL REFERENCES collectibles(id) ON DELETE CASCADE,
  found_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, collectible_id)
);

CREATE TABLE IF NOT EXISTS badges (
  id           serial PRIMARY KEY,
  code         text NOT NULL UNIQUE,
  name         text NOT NULL,
  description  text NOT NULL
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id   integer NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS mission_votes (
  mission_id  integer NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value       smallint NOT NULL CHECK (value IN (-1, 1)),
  PRIMARY KEY (mission_id, user_id)
);

CREATE TABLE IF NOT EXISTS rides (
  id          serial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_id    text NOT NULL,
  start_stop  text,
  end_stop    text,
  started_at  timestamptz NOT NULL,
  ended_at    timestamptz
);

CREATE TABLE IF NOT EXISTS district_control (
  neighbourhood_id  integer PRIMARY KEY REFERENCES neighbourhoods(id) ON DELETE CASCADE,
  faculty           text NOT NULL,
  rep_total         integer NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Continuous aggregate: which cells each user pinged per day.
-- Explored count = SELECT count(DISTINCT h3_cell) FROM user_daily_cells WHERE user_id = $1;
CREATE MATERIALIZED VIEW IF NOT EXISTS user_daily_cells
WITH (timescaledb.continuous) AS
SELECT time_bucket(INTERVAL '1 day', ts) AS bucket,
       user_id,
       h3_cell,
       count(*) AS pings
FROM location_pings
GROUP BY bucket, user_id, h3_cell
WITH NO DATA;

SELECT add_continuous_aggregate_policy('user_daily_cells',
  start_offset => INTERVAL '30 days',
  end_offset => INTERVAL '1 minute',
  schedule_interval => INTERVAL '15 minutes',
  if_not_exists => TRUE);
