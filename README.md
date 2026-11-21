# Mustang City

**Graduate knowing your city.** A GTA 6-inspired mobile web app (PWA) that turns London, Ontario into *Forest State* — a map covered in black fog that clears only where you've physically been. Built solo at Hack Western 13.

See [docs/product-brief.md](docs/product-brief.md) for the full brief.

## Develop

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev
```

## Deploy (Vercel)

1. Import `RyanPeters06/mustang-city` at vercel.com/new (framework: Next.js, defaults are fine).
2. Add the env vars from `.env.example` in Project → Settings → Environment Variables.
3. Every push to `main` deploys. Add the custom domain (mustangcity.club) under Settings → Domains.

## Install on iPhone

Open the deployed URL in Safari → Share → Add to Home Screen → launch from the icon.
