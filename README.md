# AionTools

Aion 2 tools — daily/weekly checklist (main + 8 alts, automatic resets), with builds, crafting and guides coming next. IT/EN, no login.

## Develop

    pnpm install
    pnpm dev          # http://localhost:3000
    pnpm test         # unit tests
    pnpm e2e          # Playwright end-to-end

## Content

`content/activities.json` is hand-curated from the community sheets. Reset rules are in `src/lib/regions.ts`.

## Sync

Progress lives in the browser. An optional anonymous sync code (Settings → Sync between devices) keeps a copy in Upstash Redis so the same progress works on several devices. Anyone with the code can read and change that copy.

- Production: in Vercel, Storage → Marketplace → Upstash Redis → connect it to this project. The integration injects `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL`/`KV_REST_API_TOKEN`); then redeploy.
- Local dev without Redis: `SYNC_MEMORY_STORE=1 pnpm dev` keeps sync data in memory until the server stops. Never set it in production.
- Without either, the app works normally and the sync API answers `503 not_configured`.

## Credits

Data from community spreadsheets by Castform and others. Fan-made, not affiliated with NCSoft.
