# AionTools — Design Spec

Date: 2026-10-13
Status: approved in brainstorming, awaiting written-spec review

## 1. Goal

A public web app with tools for Aion 2. It is used mainly by the author and their friends. It is:

- **Good-looking, easy to use, functional.** Desktop-first, fully responsive.
- **No login.** Progress lives in the browser and can optionally sync across devices with an anonymous sync code.
- **Bilingual.** The UI is in Italian and English.
- Hosted on **Vercel** from the GitHub repo `davidesidoti/aiontools`.

### Content sources

Content is imported once into static JSON and re-imported by hand after game patches. The app never fetches the sheets live.

| Source | ID | Access |
|---|---|---|
| "Personal Aion 2 Class Info" (Character Builds, by Castform) | `1lbHaVairHaz26M8XGNF9CBWqiiHHBM6CylTwNKnlOug` | public |
| "Aion 2 Guides" (Generic Tools, Info and Checklist) | `121rqeIxOQkEOUrXzGcP5slP6cGhqPbP-484WBjJMbeM` | public (link sharing) |

Castform says this content is moving to daevaos.com, so sheet 1 may go stale. The import is a manual step for that reason.

### v1 scope

1. Daily/weekly checklist for a Main and up to 8 alts, with automatic resets.
2. Class build pages for the 8 classes in sheet 1: Chanter, Ranger, Cleric, Spirit Master, Gladiator, Sorcerer, Templar, Assassin. They show icons for skills and items.
3. Crafting cost calculator, plus crafting tips.
4. Guides and info pages: Content Guide, Roadmap (with progress tracking), Tips/settings, Chanter vs Cleric buffs, and a link directory.

### Out of scope (phase 2+)

- "Time to cap" timers for recharge activities
- Class comparison
- Shareable links for builds and crafting
- Brawler and Elementalist (the schema already supports them, only data is missing)
- Scheduled automatic import
- Installable PWA / offline mode
- Reset notifications

## 2. Stack

- **Next.js** (App Router) with TypeScript, deployed on Vercel
- **Tailwind CSS** and **shadcn/ui**
- **next-intl** for i18n
- **Zustand** with the `persist` middleware for client state in localStorage
- **Zod** for schemas, used in the import, the build, the API and localStorage parsing
- **Upstash Redis**, added through the Vercel Marketplace, and `@upstash/ratelimit` for sync
- **@date-fns/tz** and date-fns for reset calculations
- **SheetJS** (`xlsx`) for the import script
- **Vitest** and **Playwright** for tests
- **pnpm**, and GitHub Actions for CI

Alternatives considered:

- **Astro with React islands** was rejected. Most pages are interactive client state, so mixing two paradigms adds friction.
- **A Vite SPA** was rejected. SEO is poor, and routing and i18n would have to be built by hand.

## 3. Architecture

### Routes

Every route sits under `/[locale]`, where `locale` is `it` or `en`.

| Route | Content |
|---|---|
| `/` | Dashboard: daily and weekly reset countdowns, today's checklist summary per character, quick links |
| `/checklist` | Daily, weekly and recharge tracker |
| `/builds` | Class grid |
| `/builds/[class]` | Build page (SSG, one page per class) |
| `/crafting` | Calculator, with crafting tips in a tab |
| `/guides/content` | Content Guide, filterable |
| `/guides/roadmap` | Roadmap with progress |
| `/guides/tips` | Tips and settings, with screenshots |
| `/guides/buffs` | Chanter vs Cleric |
| `/guides/links` | Class guide and creator links |
| `/settings` | Region, characters, sync code, export/import of a JSON file, faction accent |

### Layers

Each layer has one job.

```
scripts/import/     sheets xlsx → content/*.json + public/screenshots/   (manual: pnpm import:sheets)
content/            static JSON (committed), content/i18n/it.json translations, icons.json, regions.json
public/icons/       self-hosted game icons (webp)
public/screenshots/ screenshots extracted from the sheets
lib/                pure logic: reset.ts, crafting.ts, schema.ts (Zod), migrations.ts, sync-code.ts
store/              Zustand store (UserData) with localStorage persist and the sync engine
app/api/sync/       sync API route handlers
messages/           UI strings: it.json, en.json
components/         shadcn/ui primitives and domain components
```

### Data flow

**Static content.** The sheets go through the import script into JSON, and the pages are built at build time (SSG).

**User state.** The Zustand store is persisted to localStorage. When sync is enabled:

- A change is pushed to `/api/sync` (code in the `x-sync-code` header) after a 2 s debounce.
- A pull happens on load and on `visibilitychange`.

## 4. Data model

### Static content (Zod-validated)

```ts
type Text = { en: string; it?: string }           // `it` falls back to `en`

ClassBuild {
  id: string; name: string; icon: string
  skills, passives, stigmas: { name: string; level?: string; note?: string }[]  // priority order
  arcana, godStats, equipEffects, enhancing, theostones, stats: string[]
  boards: { board: "cogni"|"natura"|"special"|"fera"|"varian"; lines: { lines: string; priority: string[] }[] }[]
  wings: { meta: string[]; leveling: string[] }
  titles: { offensive: string[]; defensive: string[]; special: string[] }
  pantheon: { colossus: string[]; statues: string[]; paintings: string[] }
  soulbind: { slot: SlotId; priority: string[] }[]
  links: { label: string; url: string; kind: "guide"|"creator"|"tool" }[]
  screenshots: { src: string; caption?: Text }[]
  macros: Text
}

Activity {                                        // merges Checklist + Content Guide + Weeklies
  id: string; name: string; icon?: string
  section: "daily"|"weekly"|"recharge"|"misc"
  scope: "main"|"alt"|"both"; mode: "pve"|"pvp"; group: "solo"|"group"
  limit: { max: number; period: "day"|"week" } | { perDay: number; cap: number; capSub?: number }
  rewards, requirements, where, strategy, notes: Text
}

CraftingTier {
  id: "common"|"green"|"blue"|"gold"; name: string
  crafts: number                                  // 64 | 16 | 4 | 1
  defaultRate: number                             // 0..1
  materials: { id: string; name: string; qty: number; defaultPrice: number }[]
}
CraftingDefaults { tiers: CraftingTier[]; tax: number }   // tax default 0.10

Roadmap { steps: { id: string; milestone?: number; items: { id: string; text: Text }[] }[] }
```

Other content files:

- `content/icons.json` maps an exact game name to `/icons/...webp`. A missing icon renders a neutral placeholder, and the import prints a warning.
- `content/i18n/it.json` holds Italian translations of `Text` fields, keyed by content id. It is kept separate from the imported data so a re-import never overwrites it.

`content/regions.json` holds the reset rules, all verified on 2026-10-13 against community trackers:

| Region | Timezone | Daily reset | Weekly reset |
|---|---|---|---|
| `global` (default) | `UTC` | 07:00 UTC | Wednesday 07:00 UTC |
| `kr` | `Asia/Seoul` | 05:00 server time | Wednesday 05:00 |
| `tw` | `Asia/Taipei` | 05:00 server time | Wednesday 05:00 |

Because Global is fixed in UTC, DST only changes the local display time. The countdown shows the reset in the user's local time.

### User state (`UserData`)

The state is versioned, with migrations.

```ts
UserData {
  version: 1
  updatedAt: string                               // ISO
  settings: { region: "global"|"kr"|"tw"; accent: "elyos"|"asmodian"; onboarded: boolean }
  characters: { id: string; name: string; classId: string; isMain: boolean }[]   // 1 main + up to 8 alts
  checklist: { progress: Record<charId, Record<activityId, number>>; lastDaily: string; lastWeekly: string }
  crafting: { prices: Record<materialId, number>; rates: Record<tierId, number>; tax?: number }  // overrides only
  roadmap: { done: string[] }                     // roadmap item ids
}
```

### Import script (`pnpm import:sheets`)

The script runs in five steps:

1. Download the xlsx export of both sheets.
2. Parse each tab with its own parser. Class tabs share one template, so they share one parser.
3. Validate the output with Zod. If the layout has changed, the script **fails loudly** and writes nothing.
4. Extract the embedded screenshots to `public/screenshots/`.
5. Write the JSON files and print a diff summary for manual review before committing.

### Credits

The footer and the build pages credit Castform and the author of the second sheet, with links to the original sources.

## 5. Sync

### Code

- `POST /api/sync` generates the code on the server. The format is 3 words plus 4 digits, for example `wolf-amber-river-7421`, from a word list of about 2048 words. That gives roughly 8·10¹³ combinations.
- The code is validated with a regex on every request.

### Storage

Each code is stored under the Redis key `sync:{code}` as `UserData` JSON. The TTL is 180 days and is refreshed on every write.

### API

All endpoints take the code in a header, `x-sync-code`, and never in the URL or query string.

| Method | Body | Result |
|---|---|---|
| `POST /api/sync` | `{ data }` | `{ code }` (creates the code) |
| `GET /api/sync` | — | `200 { data }` or `404` |
| `PUT /api/sync` | `{ data, baseUpdatedAt }` | `200 { updatedAt }`, or `409 { data }` when the server copy is newer than `baseUpdatedAt` |
| `DELETE /api/sync` | — | `204` |

### Security (trust boundary)

- Every body is Zod-validated.
- Payloads over 64 KB get a `413`.
- An invalid code gets a `400`.
- Requests are rate-limited per IP to about 30 per minute, and anything over gets a `429`.
- The code never appears in logs.
- The code works like a key: whoever has it can read and write the data. This is accepted, because the data is non-personal game data.

### Client

- localStorage is always the primary store, so the app works fully offline and without sync.
- Sync status shows in the header: synced, pending, offline, or error. Errors retry automatically with backoff.
- On a 409, a dialog offers **Use cloud** (replace local) or **Overwrite** (force push).
- Settings has these actions: create a code, enter a code, copy, disconnect (local only), and delete the cloud data.

## 6. Reset logic

- `lastResetAt(now, region, period)` is a pure function. It returns the most recent reset instant at or before `now`.
- It runs on load and every 60 s:
  - If `lastDaily < lastResetAt(now, region, "day")`, daily and recharge counters go to 0 and `lastDaily` is updated.
  - Weekly counters follow the same rule.
- In v1, recharge activities are tracked as daily counters.

## 7. Error handling

- **Corrupt localStorage.** If localStorage is corrupt or fails the schema, the raw value is copied to `aiontools-backup-{timestamp}`. The app then starts fresh and shows a toast. Data is never dropped silently.
- **Old versions.** An older `version` goes through the migrations in order.
- **Network failures.** Sync failures never block the UI. Pending changes stay local and retry.
- **Bad imports.** An import that fails validation writes nothing.

## 8. UI/UX

### Visual style

- **Theme.** Dark only; there is no light theme and no theme toggle (decided 2026-10-13). Backgrounds are deep ink-blue with **gold** accents. An optional faction accent can be set: Elyos gold or Asmodian violet, through a CSS variable.
- **Type.** Headings use a restrained fantasy display font (for example Cinzel). Body text uses Inter.
- **Detail.** Cards have thin borders and a subtle glow on hover. Motion is short and respects `prefers-reduced-motion`.

### Layout

- **Desktop.** A collapsible left sidebar. The top bar holds the reset countdowns, sync status and the IT/EN switch.
- **Mobile.** A bottom tab bar with Home, Checklist, Builds, Crafting and More.
- **Ctrl+K command palette.** Searches classes, activities and guides.
- **First-visit onboarding.** Two skippable steps: pick the region, then add characters (name and class).

### Checklist

This layout was chosen on 2026-10-13 from four interactive mockups: variant D, "character cards".

- There is one card per character, laid out as a responsive grid (`minmax(280px, 1fr)`). It is the same layout on desktop and mobile; on mobile the cards stack into one column. There is no matrix and there are no tabs.
- **Card header.** Name, class, a Main badge for the main character, and a progress ring covering all sections.
- **Card sections.** Inside each card: Daily, Weekly and Recharge, each with a small uppercase heading and its own reset countdown.
- **Hidden rows.** Activities that don't apply to the character (main-only activities on an alt) are left out of that card.
- **Activity control.** It depends on the activity's maximum for that character:
  - `max ≤ 7`: a row of diamond pips. Clicking pip *n* sets the count to *n*. Clicking the last lit pip sets it to *n − 1*.
  - `max > 7`: a thin progress bar with `n/max`, plus "−" and "+" buttons.
- **Completed rows.** A finished row dims and shows ✓.
- **Activity tooltips.** Hovering an activity name shows a tooltip with its notes and stockpile cap.

### Builds

- The class grid shows class artwork.
- Class pages have a sticky header with the class icon and anchor navigation: Skills, Stigmas/Passives, Arcana/Stats, Daevanion, Soulbind, Gear/Misc, Media, Links.
- Priority lists render as numbered icon chips with tooltips.
- Soulbind is a table mapping each slot to its chips.
- Screenshots open in a lightbox.

### Crafting

- One card per tier. Number inputs are formatted as kina.
- A sticky side panel shows each tier's total, the tax and the grand **TOTAL**, updated live.
- "Reset to defaults" restores the original values.
- Crafting tips sit in a tab next to the calculator.

### Guides

- **Content Guide.** A table with filter chips (section, PvE/PvP, main/alt) and search. Rows expand to show the strategy.
- **Roadmap.** A vertical timeline by gear-score milestone, with checkboxes and a progress bar.
- **Tips.** An article with images.
- **Links.** Cards grouped by class and creator.
- **Buffs.** Chanter and Cleric side by side.

### Accessibility

- Everything works from the keyboard, with visible focus and WCAG AA contrast.
- Counters have an `aria-label`, for example "Daily Dungeon, 3 of 14".
- Touch targets are at least 44 px.

## 9. Formulas

These are ported from the sheet's Crafting Calculator.

```
materialCost   = qty × price
expectedCrafts = crafts / rate                    // crafts = 64 | 16 | 4 | 1
tierTotal      = Σ(materialCost) × expectedCrafts
subtotal       = Σ tierTotal
total          = subtotal × (1 + tax)
```

**Validation.** With the defaults imported from the sheet, `total` must match the sheet's TOTAL KINA (about 30.5M). The exact value comes from the import fixture.

## 10. i18n

- Locales: `it` and `en`. A request to `/` redirects by `Accept-Language`, falling back to `en`. The chosen locale is stored in a cookie.
- UI strings live in `messages/{it,en}.json`. Content `Text` fields fall back to `en`.
- Game names stay in English: skill, item, stigma and title names are not translated.
- Numbers use `Intl.NumberFormat`. Countdowns use `Intl.RelativeTimeFormat` or the duration formatting that next-intl provides.
- CI fails if `it.json` is missing a key that exists in `en.json`.

## 11. Icons

- Game icons are self-hosted in `public/icons/` as webp files. They are downloaded once from a community database or from game data dumps.
- `content/icons.json` maps each name to its file.
- Class icons are required for v1. Skill and item icons are added as they are sourced, and the placeholder fallback keeps pages working in the meantime.
- Risk: the icons are NCSoft assets. Fan sites commonly use them, but this carries no legal guarantee. The risk was accepted for a non-commercial fan tool.

## 12. Testing

- **Unit tests (Vitest)** on `lib/`:
  - `lastResetAt` around day and week boundaries, for each region, and across a DST change in the viewer's local timezone.
  - The crafting formulas against the sheet total.
  - Migrations.
  - Schema validation.
  - Sync code generation and its regex.
- **Import parser tests** against committed xlsx fixtures.
- **Sync API tests** run the handlers against an in-memory Redis mock. They cover 400 (bad code), 413 (oversize), 409 (conflict), 429 (rate limit), and the happy path.
- **E2E tests (Playwright):**
  - Onboarding, then tick the checklist, reload, and confirm the state persisted.
  - Create a sync code, open a new browser context, enter the code, and confirm the same data appears.

## 13. Deploy and CI

- The GitHub repo is imported into Vercel. Upstash Redis comes from the Vercel Marketplace, which injects its env vars.
- Every PR gets a preview deploy, and `main` deploys to production.
- GitHub Actions runs lint, typecheck, unit tests and build on each PR.
