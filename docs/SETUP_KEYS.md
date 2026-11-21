# Accounts and API keys

Ordered by impact. Never paste keys into chat or commit them. Put them in Vercel (Project → Settings → Environment
Variables) and, for Claude's cloud sessions, add them through the secure credential form Claude offers.

## Must-have (unlocks features that are already built)

| # | Service | Get it | Env vars | Unlocks | Cost |
|---|---|---|---|---|---|
| 1 | **Gemini API** | Google AI Studio → Get API key | `GEMINI_API_KEY` (optional `RADIO_VOICE`) | Photo mission checks, Goose briefings, Forest FM script + voice, tag and student-job screening, timetable screenshots; can also generate the cover art | Free tier |
| 2 | **Auth0** | auth0.com → free tenant → Regular Web App; follow the README "Auth0" steps (callback URLs + the @uwo.ca Action) | `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` (`openssl rand -hex 32`), `APP_BASE_URL` | Sign-in, friends, leaderboards, server tags, heists, turf, student jobs | Free |
| 3 | **Tiger Data** (Postgres + TimescaleDB) | tigerdata.com → free trial service → connection string | `DATABASE_URL`, then `npm run db:schema && npm run db:seed` | All account data; GPS pings hypertable; continuous aggregate for weekly stats | Free trial |
| 4 | **Mapbox** | done | `NEXT_PUBLIC_MAPBOX_TOKEN` | Map | Free tier |

**Why Tiger Data stays the main database (not Supabase):** the schema uses a TimescaleDB hypertable and a continuous
aggregate, it's an MLH prize track the brief prioritises, and Supabase has removed TimescaleDB from its Postgres 17 builds.
Switching fully to Supabase is possible (the app talks plain Postgres via `DATABASE_URL`) but means rewriting those two
features and giving up the Tiger Data prize.

## Recommended add-on: Supabase (Realtime + Storage)

Use Supabase *alongside* Tiger Data for the two things it's best at:
- **Realtime channels:** heist crews update instantly (instead of 5-second polling), the live big-screen `/stage` mirror,
  and future loot challenges.
- **Storage:** real photo files for tags, mission photos and posters (today they're small data URLs).

Get it: supabase.com → new project → Project Settings → API.

Env vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public by design and safe with row-level security, but it's a second public key, so
  the constitution's "only the Mapbox token is public" rule needs a one-line amendment. The alternative is relaying
  Realtime through our server.
- `SUPABASE_SERVICE_ROLE_KEY`: server only.

Free tier.

## Prize-track extras

| Service | Why | Env vars |
|---|---|---|
| **GoDaddy Registry domain** (MLH offer) | MLH domain prize; point it at Vercel (e.g. mustangcity.rodeo) | none (DNS) |
| **Vultr Object Storage** | MLH Vultr prize: put photo storage here instead of Supabase Storage | `VULTR_S3_ENDPOINT`, `VULTR_S3_ACCESS_KEY`, `VULTR_S3_SECRET_KEY`, `VULTR_S3_BUCKET` |
| **Entire** | MLH Entire prize; already enabled, record token savings for the write-up | none |

## Nice to have

| Service | Why | Notes |
|---|---|---|
| **Web Push (VAPID keys)** | Daily Job / streak notifications on home-screen iPhones (iOS 16.4+) | No account: generate keys locally |
| **Vercel Analytics** | Real usage numbers for the pitch ("N students walked X km") | One toggle in Vercel |
| **Sentry** | Catch errors on judges' phones during the demo | Free tier, `SENTRY_DSN` |

## No key needed (already integrated)
- London Transit open data (routes + live buses)
- Open-Meteo weather (credited in Profile)
- City of London open data (neighbourhoods)
