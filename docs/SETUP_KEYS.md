# Accounts and API keys

Ordered by impact. Never paste keys into chat or commit them. Put them in Vercel (Project → Settings → Environment
Variables) and, for Claude's cloud sessions, add them through the secure credential form Claude offers.

## Must-have (unlocks features that are already built)

| # | Service | Get it | Env vars | Unlocks | Cost |
|---|---|---|---|---|---|
| 1 | **Gemini API** | Google AI Studio → Get API key | `GEMINI_API_KEY` (optional `RADIO_VOICE`) | Photo mission checks, Goose briefings, Forest FM script + voice, tag and student-job screening, timetable screenshots; can also generate the cover art | Free tier |
| 2 | **Auth0** | auth0.com → free tenant → Regular Web App; follow the README "Auth0" steps (callback URLs + the @uwo.ca Action) | `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` (`openssl rand -hex 32`), `APP_BASE_URL` | Sign-in, friends, leaderboards, server tags, heists, turf, student jobs | Free |
| 3 | **Supabase** (Postgres) | supabase.com → new project → **Connect** → Transaction pooler (port 6543) URI, with your DB password filled in | `DATABASE_URL`, then `npm run db:schema && npm run db:seed` | All account data: profiles, friends, missions, GPS pings, leaderboards, tags, heists, turf | Free |
| 4 | **Mapbox** | done | `NEXT_PUBLIC_MAPBOX_TOKEN` | Map | Free tier |

**Database decision (Nov 22):** Supabase replaces Tiger Data. The app talks plain Postgres through `DATABASE_URL`
(`lib/db.ts`), so the only schema changes were dropping the TimescaleDB hypertable (now a plain indexed table) and turning
the continuous aggregate into a plain view. `lib/db.ts` turns off prepared statements automatically on the pooler URL.
Use the **transaction pooler** string (port 6543) on Vercel; the direct connection is IPv6-only on the free tier.

Later, Supabase can also add **Realtime** (live heist crews instead of 5-second polling) and **Storage** (real photo files
instead of small data URLs). Those need `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a second public key,
so the "only the Mapbox token is public" rule needs a one-line amendment) and a server-only `SUPABASE_SERVICE_ROLE_KEY`.

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
