# Mustang City

**Graduate knowing your city.** A GTA 6-inspired mobile web app (PWA) that turns London, Ontario into *Forest State* — a map covered in black fog that clears only where you've physically been. Built solo at Hack Western 13.

See [docs/product-brief.md](docs/product-brief.md) for the full brief.

## Develop

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev
```

Press **D** on a laptop for hidden demo controls (scripted campus walk, fly to campus, reset fog).

## Database (Tiger Data)

Put `DATABASE_URL` in `.env.local`, then:

```bash
npm run db:schema   # tables, location_pings hypertable, continuous aggregate
npm run db:seed     # landmark + starter missions, badges (safe to re-run)
```

## Auth0

1. Create a Regular Web Application. Allowed Callback URLs: `https://<domain>/auth/callback`;
   Allowed Logout URLs: `https://<domain>`, `https://<domain>/?denied=uwo` (add the localhost equivalents too).
2. Actions → Library → Create Action (Post Login) → paste `auth0/uwo-only-action.js` → Deploy → add it to the post-login trigger.
3. Set `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` (`openssl rand -hex 32`), `APP_BASE_URL`.

## Deploy (Vercel)

1. Import `RyanPeters06/mustang-city` at vercel.com/new (framework: Next.js, defaults are fine).
2. Add the env vars from `.env.example` in Project → Settings → Environment Variables.
3. Every push to `main` deploys. Add the custom domain (mustangcity.rodeo) under Settings → Domains.

## Install on iPhone

Open the deployed URL in Safari → Share → Add to Home Screen → launch from the icon.
