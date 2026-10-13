# AionTools

Aion 2 tools: a daily/weekly checklist for a main and 8 alts with automatic resets, class builds for all 8 classes, a crafting cost calculator, guides (content guide, roadmap with progress, tips, Chanter vs Cleric, class guides) and Ctrl+K search. IT/EN, no login, optional sync between devices.

## Develop

    pnpm install
    pnpm dev          # http://localhost:3000
    pnpm test         # unit tests
    pnpm e2e          # Playwright end-to-end

## Content

`content/activities.json` is hand-curated from the community sheets. Reset rules are in `src/lib/regions.ts`.

Guide and crafting content lives in `content/` as JSON with English and Italian text side by side (`{ "en": …, "it": … }`). Images come from the community spreadsheets via `node scripts/import-guide-images.mts`.

Class builds come from Castform's spreadsheet via `node scripts/import-builds.mts` (re-runnable; fails if the sheet layout changes). Italian for their free-text notes lives in `content/builds/it.json`, keyed by the English sentence. Skill icons come from questlog.gg's database and class icons from DaevaOS, via `node scripts/import-skill-icons.mts`.

## Sync

Progress lives in the browser. An optional anonymous sync code (Settings → Sync between devices) keeps a copy in Upstash Redis so the same progress works on several devices. Anyone with the code can read and change that copy.

- Production: in Vercel, Storage → Marketplace → Upstash Redis → connect it to this project. The integration injects `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL`/`KV_REST_API_TOKEN`); then redeploy.
- Local dev without Redis: `SYNC_MEMORY_STORE=1 pnpm dev` keeps sync data in memory until the server stops. Never set it in production.
- Without either, the app works normally and the sync API answers `503 not_configured`.

## Credits

Data from community spreadsheets by Castform and others. Fan-made, not affiliated with NCSoft.
