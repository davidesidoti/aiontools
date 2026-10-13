# AionTools Plan 4 — Crafting + Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** This plan adds three things:
- a kina crafting calculator, with crafting tips;
- a Guides section: a filterable Content Guide, a Roadmap that tracks your progress, Tips and settings, Chanter vs Cleric, and class guide links;
- a Ctrl+K command palette.

All guide text is available in English and Italian. Checklist tooltips also gain rewards and locations from the Content Guide.

**Architecture:**
- Guide and crafting content are committed JSON files under `content/` (`{ en, it }` text inline). Zod validates them when the module loads, as `activities.json` is in plan 1.
- Images (Content Guide icons, settings screenshots, crafted vs expedition) come from the source spreadsheets. A committed one-off script, `scripts/import-guide-images.mts`, extracts them into `public/guides/`.
- Pure logic lives in `src/lib/crafting.ts`, `src/lib/guides.ts` and `src/lib/search.ts`, and is unit-tested. Pages are App Router server components. Interactive parts (calculator, filters, roadmap checkboxes, palette) are client components that read the user store.

**Tech Stack:** As in plans 1 and 2, plus `exceljs` (dev only, for the image script), shadcn `tabs` and `command` (cmdk).

**Spec:** `docs/superpowers/specs/2026-10-13-aiontools-design.md`, sections 3 (routes), 4 (data model), 8 (UI: Crafting, Guides, Ctrl+K) and 9 (formulas).

**Branch:** `feat/plan4-crafting-guides`, created from `feat/plan2-sync` (PR #2 is still open). Open the PR against `main` if #2 has merged by then, otherwise against `feat/plan2-sync`.

### Deliberate deviations from the spec

| Spec | Plan 4 | Why |
|---|---|---|
| `pnpm import:sheets` generates the guide JSON, and IT text lives in `content/i18n/it.json` | The guide JSON is transcribed once, with `{ en, it }` inline in each file. Only the images are extracted by a script. | The guide tabs are free-form text, so a cell parser would be brittle. Sheet 1's author is also moving to DaevaOS. Keeping the IT text next to the EN text makes it easy to review and to keep in step. |
| The Content Guide is merged into `Activity` | The Content Guide gets its own file, `content/guides/content-guide.json`. Activities point to it by id, with an optional `guide` field. | The checklist activities and the Content Guide rows don't map one to one (Sanctuary, Conquest, Expedition, Misc). |
| Crafting quantities are editable | Quantities are fixed. Prices, success rates and tax can be edited. | Quantities are recipe data, and `UserData.crafting` only stores prices, rates and tax. |
| Content Guide loot legend (row 1 icons) | Skipped | Its 4 icons describe loot quality, not an activity, and nothing in the UI refers to them. |

## Global Constraints

Everything from the plan 1 and plan 2 Global Constraints still applies. This plan adds the following.

### Translation rules (IT)

These apply to every `{ en, it }` in `content/`.

- **Keep in English:** the proper names of the game, including:
  - activity, dungeon, area and item names;
  - material and class names;
  - buff and skill names;
  - stat names (Critical Hit, Accuracy, Combat Speed, CDR, Max HP…);
  - currencies and resources (Kina, Odyle, Odyle Energy);
  - UI menu paths (`Escape>Journal>Duty`);
  - the abbreviations PvE, PvP, BiS, AFK, MSQ and HP.
- **Translate into Italian:** every description, instruction, strategy, note and label. Write natural, concise Italian that addresses the reader informally ("tu").
- **Numbers:** keep the values. Italian prose uses a decimal comma and a thousands dot (`22,5%`, `2.000`).
- **Meaning:** keep the meaning and add nothing. Fix obvious EN typos while transcribing: "Transcendance"→"Transcendence", "Ressurects"→"Resurrects", "Change to restore"→"Chance to restore", "Weeky"→"Weekly", "Conguest"→"Conquest".
- **URLs:** never change them, except to drop tracking query parameters such as `session_sync_attempted`.

### Other rules

- **`FullText`:** every guide and crafting text is a `FullText` (`{ en: string; it: string }`, both non-empty). Tests enforce this.
- **Number formatting:** kina amounts go through `Intl.NumberFormat(locale, { maximumFractionDigits: 0 })`. In English the default total renders as `30,477,639`, in Italian as `30.477.639`.
- **Input bounds:**

  | Input | Range |
  |---|---|
  | Price | 0 or more |
  | Success rate | 0.1–100 % (stored as 0.001–1) |
  | Tax | 0–100 % (stored as 0–1) |

  An invalid input snaps back to the last valid value, and totals are never `NaN`.
- **Routes:** `/[locale]/crafting`, plus `/[locale]/guides` and the guide pages `content`, `roadmap`, `tips`, `buffs` and `links` under it. All of them are statically generated through `generateStaticParams` in the locale layout.
- **Navigation:** add Crafting and Guides to the sidebar and bottom nav (bottom nav: 5 items).
  - A nav item counts as active when `pathname === href`, or when `pathname` starts with `href + "/"`. Home is the exception: it is active only when `pathname === "/"`.
- **Images:** they live under `public/guides/` and are referenced from JSON as `/guides/...`. Tests check that every referenced file exists.
- **Touch targets:** the 44 px minimum still applies (`min-h-11`), filter chips included.
- **Git:** the same commit rules as plans 1 and 2. If the identity is missing, use `git -c user.name="Davide Sidoti" -c user.email="sidotidavide@gmail.com"`. Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Source data for transcription:** use these files:
  - `C:\Users\sidot\AppData\Local\Temp\claude\C--Users-sidot-Documents-Github-aiontools\060ce9db-56d1-4318-872d-18a94761e838\scratchpad\sheets\tools_dump.json` (sheet 2)
  - `…\builds_dump.json` (sheet 1)

  Each holds `{ tab: { rows: [[{c: "A3", v: ...}]] } }`. If they are missing, download them again with `https://docs.google.com/spreadsheets/d/<ID>/export?format=xlsx` and read them with exceljs.

## Review Focus

These are the input classes most likely to hurt a real user. Each line names the test that pins it down.

1. **Garbage in a number field** (empty, letters, negative, or a 0 % rate, which would divide by zero). The field must snap back, and totals must stay finite. Tests: Task 2 (`setCraftingPrice` and `setCraftingRate` reject bad values) and Task 3 (`NumberField` reverts invalid drafts).
2. **Content updates that rename or remove roadmap steps** while `UserData.roadmap.done` still holds the old ids. Progress must ignore unknown ids, and unknown ids must not be toggled into storage. Test: Task 5 (`roadmapProgress` ignores unknown ids; `toggleRoadmapItem` is a no-op for them).
3. **Filters plus search that match nothing,** and search terms typed in the other language or in different case. The page must show an empty state, never a crash or a blank page, and search must match the localized text case-insensitively. Test: Task 5 (`filterGuide` cases).
4. **A deep link or palette jump to an activity on the same page.** The entry must open and scroll into view without a full reload. Test: Task 9 E2E ("Ctrl+K jumps to an activity").
5. **An activity whose Content Guide id differs from its checklist id** (Supply Requests daily or weekly, Shugo key), or that has no guide entry (Sanctuary, Conquest). The checklist tooltip must still render: with hints when a guide entry exists, without them otherwise. Tests: Task 5 (every explicit `guide` link resolves) and Task 7 (`activityHints` for linked, renamed and unlinked activities).

---

## File Map

```
scripts/import-guide-images.mts          one-off image extraction (committed)
public/guides/content/*.png              Content Guide icons
public/guides/tips/setting-N.png         settings screenshots
public/guides/crafting/{crafted,expedition}.png
content/crafting.json                    calculator defaults (tiers, materials, tax)
content/crafting-tips.json               crafting tips
content/guides/content-guide.json        24 activities
content/guides/roadmap.json, tips.json, buffs.json, links.json
content/activities.json                  (modify) optional "guide" links
src/lib/text.ts                          FullTextSchema
src/lib/crafting.ts                      schemas, CRAFTING, CRAFTING_TIPS, computeCrafting, set*/reset
src/lib/guides.ts                        schemas, CONTENT_GUIDE, ROADMAP, TIPS, BUFFS, LINKS, filterGuide, roadmap ops, guideFor
src/lib/search.ts                        buildSearchIndex
src/lib/activities.ts                    (modify) optional guide field
src/components/number-field.tsx          draft-and-commit numeric input
src/components/crafting/crafting-calculator.tsx, crafting-tips.tsx
src/components/guides/guide-content-view.tsx, roadmap-view.tsx
src/components/checklist/activity-hints.ts (+ character-card.tsx modify)
src/components/command-palette.tsx
src/components/shell/nav-items.ts, sidebar.tsx, bottom-nav.tsx, top-bar.tsx (modify)
src/app/[locale]/crafting/page.tsx
src/app/[locale]/guides/page.tsx, content/, roadmap/, tips/, buffs/, links/ page.tsx
messages/en.json, messages/it.json       (modify) nav, crafting, guides, palette, checklist keys
e2e/guides.spec.ts, README.md
```

---

### Task 1: Image extraction script

**Files:**
- Create: `scripts/import-guide-images.mts`
- Generated: files under `public/guides/`

**Interfaces:**
- Produces:
  - Content Guide icons: `public/guides/content/<slug>.<ext>`, where the slug is `slugify(name)` after the typo renames.
  - Settings screenshots: `public/guides/tips/setting-<n>.<ext>`, numbered by sheet row order.
  - Crafting comparison: `public/guides/crafting/crafted.<ext>` and `expedition.<ext>`.
  - The script prints one `wrote <path>` line per file. Later tasks reference exactly these paths.

- [ ] **Step 1: Install exceljs**

Run: `pnpm add -D exceljs`

- [ ] **Step 2: Write the script**

```ts
// scripts/import-guide-images.mts
// One-off: extracts images from the community spreadsheets into public/guides/.
// Run with `node scripts/import-guide-images.mts` (Node ≥ 23.6 strips TypeScript types natively).
import ExcelJS from "exceljs";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const SHEETS = {
  builds: "1lbHaVairHaz26M8XGNF9CBWqiiHHBM6CylTwNKnlOug",
  tools: "121rqeIxOQkEOUrXzGcP5slP6cGhqPbP-484WBjJMbeM",
};
// Sheet typos fixed in content/: keep icon file names in step with the corrected ids.
const RENAME: Record<string, string> = { transcendance: "transcendence" };

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function load(id: string) {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`);
  if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(await res.arrayBuffer()));
  return wb;
}

function images(wb: ExcelJS.Workbook, tab: string) {
  const ws = wb.getWorksheet(tab);
  if (!ws) throw new Error(`missing tab: ${tab}`);
  return ws
    .getImages()
    .map((img) => ({ row: img.range.tl.nativeRow + 1, col: img.range.tl.nativeCol + 1, media: wb.getImage(Number(img.imageId)) }))
    .sort((a, b) => a.row - b.row || a.col - b.col);
}

function save(path: string, media: ExcelJS.Image) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.from(media.buffer!));
  console.log("wrote", path);
}

const tools = await load(SHEETS.tools);
const guide = tools.getWorksheet("Content Guide")!;
for (const img of images(tools, "Content Guide")) {
  if (img.col !== 2) continue; // column B holds the activity icons; row 1 legend icons are skipped
  const name = guide.getCell(img.row, 1).text.trim();
  if (!name) continue;
  const slug = RENAME[slugify(name)] ?? slugify(name);
  save(`public/guides/content/${slug}.${img.media.extension}`, img.media);
}
for (const img of images(tools, "Crafting Tips")) {
  save(`public/guides/crafting/${img.col <= 13 ? "crafted" : "expedition"}.${img.media.extension}`, img.media);
}

const builds = await load(SHEETS.builds);
images(builds, "Tips(+settings)").forEach((img, i) => save(`public/guides/tips/setting-${i + 1}.${img.media.extension}`, img.media));
```

- [ ] **Step 3: Run it and check the output**

Run: `node scripts/import-guide-images.mts`

Expected:
- about 20–24 `wrote public/guides/content/…` lines (one per activity row that has an icon);
- 2 `crafting` lines;
- several `tips/setting-N` lines;
- no exception.

If exceljs returns no images for a tab, Google may have exported them as in-cell images, which exceljs cannot read. In that case, write a ledger ruling and go on without those images. The JSON in later tasks then omits the matching `icon`, `images` or `settings.images` entries.

If the script fails on the TypeScript syntax, run it as `node --experimental-strip-types scripts/import-guide-images.mts`.

Run: `ls public/guides/content public/guides/tips public/guides/crafting`
Expected: the files listed by the script. Write the exact list down: Task 2 and Task 5 reference it.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: extract guide images from the community spreadsheets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Crafting content and calculator logic

**Files:**
- Create: `src/lib/text.ts`, `src/lib/crafting.ts`, `content/crafting.json`, `content/crafting-tips.json`
- Test: `src/lib/crafting.test.ts`

**Interfaces:**
- Consumes: `UserData` and `localize`
- Produces:
  - `FullTextSchema` and `type FullText = { en: string; it: string }`
  - `CRAFTING: CraftingDefaults` and `CRAFTING_TIPS: CraftingTips`
  - `computeCrafting(defaults: CraftingDefaults, overrides: UserData["crafting"]): CraftingResult`, where:

```ts
CraftingResult = {
  tiers: {
    id; name: FullText; crafts: number; rate: number; expectedCrafts: number; total: number;
    materials: { id; name: string; qty: number; price: number; cost: number; expected: number }[];
  }[];
  subtotal: number; tax: number; taxAmount: number; total: number;
}
```

  - `setCraftingPrice(d, materialId, price)`, `setCraftingRate(d, tierId, rate)`, `setCraftingTax(d, tax)` and `resetCrafting(d)`. Each one returns the same object when the input is invalid or unknown.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/crafting.test.ts
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { CRAFTING, CRAFTING_TIPS, computeCrafting, setCraftingPrice, setCraftingRate, setCraftingTax, resetCrafting } from "./crafting";
import { createDefaultUserData } from "./user-data";

const none = { prices: {}, rates: {} };
const base = () => createDefaultUserData(new Date("2026-10-14T10:00:00.000Z"));

describe("computeCrafting", () => {
  it("matches the spreadsheet with default values", () => {
    const r = computeCrafting(CRAFTING, none);
    expect(r.subtotal).toBeCloseTo(27_706_944.27, 1);
    expect(r.taxAmount).toBeCloseTo(2_770_694.43, 1);
    expect(r.total).toBeCloseTo(30_477_638.7, 1);
    expect(r.tiers.map((t) => Math.round(t.total))).toEqual([552_352, 3_515_163, 7_640_021, 15_999_409]);
    expect(r.tiers[0].expectedCrafts).toBeCloseTo(68.7433, 3);
  });
  it("applies price, rate and tax overrides", () => {
    const r = computeCrafting(CRAFTING, { prices: { "common-material": 2000 }, rates: { common: 1 }, tax: 0 });
    expect(r.tiers[0].materials[0]).toMatchObject({ price: 2000, cost: 2000, expected: 128_000 });
    expect(r.tiers[0].expectedCrafts).toBe(64);
    expect(r.taxAmount).toBe(0);
    expect(Number.isFinite(r.total)).toBe(true);
  });
});

describe("crafting ops", () => {
  it("stores valid overrides", () => {
    let d = setCraftingPrice(base(), "common-material", 2500);
    d = setCraftingRate(d, "gold", 0.5);
    d = setCraftingTax(d, 0.05);
    expect(d.crafting).toEqual({ prices: { "common-material": 2500 }, rates: { gold: 0.5 }, tax: 0.05 });
    expect(resetCrafting(d).crafting).toEqual({ prices: {}, rates: {} });
  });
  it("rejects invalid values and unknown ids (same reference)", () => {
    const d = base();
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY]) expect(setCraftingPrice(d, "common-material", bad)).toBe(d);
    expect(setCraftingPrice(d, "nope", 10)).toBe(d);
    for (const bad of [0, -0.5, 1.01, Number.NaN]) expect(setCraftingRate(d, "common", bad)).toBe(d);
    expect(setCraftingRate(d, "nope", 0.5)).toBe(d);
    for (const bad of [-0.01, 1.5, Number.NaN]) expect(setCraftingTax(d, bad)).toBe(d);
  });
});

describe("crafting content", () => {
  it("has unique material ids and fully translated names", () => {
    const ids = CRAFTING.tiers.flatMap((t) => t.materials.map((m) => m.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of CRAFTING.tiers) expect(t.name.it.length).toBeGreaterThan(0);
  });
  it("tips reference existing images", () => {
    for (const img of CRAFTING_TIPS.images) expect(existsSync(join("public", img.src)), img.src).toBe(true);
    expect(CRAFTING_TIPS.carryOver).toHaveLength(8);
    expect(CRAFTING_TIPS.misc).toHaveLength(6);
  });
});
```

Run: `pnpm test src/lib/crafting.test.ts`
Expected: FAIL, because the module cannot be found.

- [ ] **Step 2: Create `src/lib/text.ts`**

```ts
// src/lib/text.ts
import { z } from "zod";

// Guide and crafting content is fully translated: both languages are required.
export const FullTextSchema = z.object({ en: z.string().min(1), it: z.string().min(1) });
export type FullText = z.infer<typeof FullTextSchema>;
```

- [ ] **Step 3: Create `content/crafting.json`**

The values are transcribed from sheet 2, tab "Crafting Calculator", A4:E33.

```json
{
  "tax": 0.1,
  "tiers": [
    { "id": "common", "name": { "en": "Common", "it": "Comune" }, "crafts": 64, "defaultRate": 0.931, "materials": [
      { "id": "common-material", "name": "Common Material", "qty": 1, "defaultPrice": 1799 },
      { "id": "common-refining-stone", "name": "Refining Stone", "qty": 3, "defaultPrice": 1153 },
      { "id": "common-odyle", "name": "Odyle", "qty": 1, "defaultPrice": 2777 }
    ] },
    { "id": "green", "name": { "en": "Green", "it": "Verde" }, "crafts": 16, "defaultRate": 0.946, "materials": [
      { "id": "green-experts-refining-stone", "name": "Expert's Refining Stone", "qty": 3, "defaultPrice": 66888 },
      { "id": "green-fine-material", "name": "Fine Material", "qty": 3, "defaultPrice": 698 },
      { "id": "green-fine-odyle", "name": "Fine Odyle", "qty": 2, "defaultPrice": 2538 }
    ] },
    { "id": "blue", "name": { "en": "Blue", "it": "Blu" }, "crafts": 4, "defaultRate": 0.968, "materials": [
      { "id": "blue-artisans-refining-stone", "name": "Artisan's Refining Stone", "qty": 3, "defaultPrice": 533333 },
      { "id": "blue-pure-material", "name": "Pure Material", "qty": 4, "defaultPrice": 34444 },
      { "id": "blue-pure-odyle", "name": "Pure Odyle", "qty": 2, "defaultPrice": 55555 }
    ] },
    { "id": "gold", "name": { "en": "Gold", "it": "Oro" }, "crafts": 1, "defaultRate": 0.94, "materials": [
      { "id": "gold-artisans-ultimate-refining-stone", "name": "Artisan's Ultimate Refining Stone", "qty": 2, "defaultPrice": 222222 },
      { "id": "gold-fine-material", "name": "Fine Material", "qty": 11, "defaultPrice": 45000 },
      { "id": "gold-unique-material", "name": "Unique Material", "qty": 5, "defaultPrice": 2500000 },
      { "id": "gold-radiant-material", "name": "Radiant Material", "qty": 5, "defaultPrice": 220000 },
      { "id": "gold-radiant-odyle", "name": "Radiant Odyle", "qty": 2, "defaultPrice": 250000 }
    ] }
  ]
}
```

- [ ] **Step 4: Create `content/crafting-tips.json`**

The values are transcribed from sheet 2, tab "Crafting Tips". In `images`, use the exact file names Task 1 wrote. If Task 1 extracted no crafting images, use `"images": []`.

```json
{
  "base": [
    { "tier": { "en": "Base item", "it": "Oggetto base" }, "item": "Splendent", "needed": 64 },
    { "tier": { "en": "Expert's", "it": "Expert's" }, "item": "Expert's Splendent", "needed": 16 },
    { "tier": { "en": "Artisan's", "it": "Artisan's" }, "item": "Artisan's Splendent", "needed": 4 },
    { "tier": { "en": "True Dragon Lord", "it": "True Dragon Lord" }, "item": "Splendent True Dragon Lord" }
  ],
  "transfer": [
    { "item": "Splendent True Dragon Lord", "result": null },
    { "item": "White Dragon Lord", "result": "Splendent White Dragon Lord" },
    { "item": "Splendent White Dragon Lord", "result": null },
    { "item": "Wise Dragon Lord", "result": "Splendent Wise Dragon Lord" },
    { "item": "Splendent Wise Dragon Lord", "result": null }
  ],
  "carryOver": [
    { "label": { "en": "Enhancement level (+12, etc.)", "it": "Livello di potenziamento (+12, ecc.)" }, "carries": true },
    { "label": { "en": "Additional amp levels", "it": "Livelli di amp aggiuntivi" }, "carries": true },
    { "label": { "en": "Soul Binding stat lines", "it": "Linee di statistiche del Soul Binding" }, "carries": true },
    { "label": { "en": "Soul Binding upgraded values", "it": "Valori potenziati del Soul Binding" }, "carries": true },
    { "label": { "en": "Philosopher's stat", "it": "Statistica Philosopher's" }, "carries": false },
    { "label": { "en": "Manastones / Soulstones", "it": "Manastone / Soulstone" }, "carries": false },
    { "label": { "en": "Theostones", "it": "Theostone" }, "carries": false },
    { "label": { "en": "Potential stats", "it": "Statistiche potenziali" }, "carries": false }
  ],
  "misc": [
    { "en": "Reaching level 50 in Decoration takes 450 crafts.", "it": "Per arrivare al livello 50 in Decoration servono 450 craft." },
    { "en": "Artisan's Refining Stones come from the level 50 achievement of each crafting category, on every character.", "it": "Gli Artisan's Refining Stone si ottengono dall'achievement di livello 50 di ogni categoria di crafting, su ogni personaggio." },
    { "en": "You can craft while AFK or sleeping.", "it": "Puoi craftare anche in AFK o mentre dormi." },
    { "en": "The best gathering setup for Essence Extraction is Proficient Handling 10, Delicate Touch 9 and Lady Luck 6. Max out the specific material you're hunting and Odyle, since both are used in crafting.", "it": "Il setup migliore per la raccolta in Essence Extraction è Proficient Handling 10, Delicate Touch 9 e Lady Luck 6. Massimizza il materiale specifico che stai cercando e l'Odyle, perché servono entrambi per il crafting." },
    { "en": "Crafting individual materials is more efficient than crafting in bulk.", "it": "Craftare i materiali uno alla volta è più efficiente che craftarli in blocco." },
    { "en": "Crafted gear is BiS: it has 5 Soul Bind stat lines versus 4 on Expedition gear.", "it": "L'equip craftato è BiS: ha 5 linee di statistiche Soul Bind contro le 4 dell'equip da Expedition." }
  ],
  "images": [
    { "src": "/guides/crafting/crafted.png", "label": { "en": "Crafted", "it": "Craftato" } },
    { "src": "/guides/crafting/expedition.png", "label": { "en": "Expedition", "it": "Expedition" } }
  ]
}
```

- [ ] **Step 5: Implement `src/lib/crafting.ts`**

```ts
// src/lib/crafting.ts
import { z } from "zod";
import defaultsRaw from "@content/crafting.json";
import tipsRaw from "@content/crafting-tips.json";
import { FullTextSchema } from "./text";
import type { UserData } from "./user-data";

const Asset = z.string().regex(/^\/guides\/[a-z0-9/-]+\.(png|jpe?g|webp|gif)$/);

const CraftingDefaultsSchema = z.object({
  tax: z.number().min(0).max(1),
  tiers: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z]+$/),
        name: FullTextSchema,
        crafts: z.number().positive(),
        defaultRate: z.number().gt(0).max(1),
        materials: z
          .array(z.object({ id: z.string().regex(/^[a-z0-9-]+$/), name: z.string().min(1), qty: z.number().positive(), defaultPrice: z.number().min(0) }))
          .min(1),
      }),
    )
    .min(1),
});
export type CraftingDefaults = z.infer<typeof CraftingDefaultsSchema>;

const CraftingTipsSchema = z.object({
  base: z.array(z.object({ tier: FullTextSchema, item: z.string().min(1), needed: z.number().int().positive().optional() })),
  transfer: z.array(z.object({ item: z.string().min(1), result: z.string().min(1).nullable() })),
  carryOver: z.array(z.object({ label: FullTextSchema, carries: z.boolean() })),
  misc: z.array(FullTextSchema),
  images: z.array(z.object({ src: Asset, label: FullTextSchema })),
});
export type CraftingTips = z.infer<typeof CraftingTipsSchema>;

export const CRAFTING = CraftingDefaultsSchema.parse(defaultsRaw);
export const CRAFTING_TIPS = CraftingTipsSchema.parse(tipsRaw);

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

// Formulas from the sheet: cost = qty × price; expected crafts = crafts / rate; total = Σ tiers × (1 + tax).
export function computeCrafting(defaults: CraftingDefaults, overrides: UserData["crafting"]) {
  const tiers = defaults.tiers.map((t) => {
    const rate = overrides.rates[t.id] ?? t.defaultRate;
    const expectedCrafts = t.crafts / rate;
    const materials = t.materials.map((m) => {
      const price = overrides.prices[m.id] ?? m.defaultPrice;
      const cost = m.qty * price;
      return { id: m.id, name: m.name, qty: m.qty, price, cost, expected: cost * expectedCrafts };
    });
    return { id: t.id, name: t.name, crafts: t.crafts, rate, expectedCrafts, materials, total: sum(materials.map((m) => m.expected)) };
  });
  const subtotal = sum(tiers.map((t) => t.total));
  const tax = overrides.tax ?? defaults.tax;
  return { tiers, subtotal, tax, taxAmount: subtotal * tax, total: subtotal * (1 + tax) };
}
export type CraftingResult = ReturnType<typeof computeCrafting>;

const MATERIAL_IDS = new Set(CRAFTING.tiers.flatMap((t) => t.materials.map((m) => m.id)));
const TIER_IDS = new Set(CRAFTING.tiers.map((t) => t.id));

export function setCraftingPrice(data: UserData, materialId: string, price: number): UserData {
  if (!MATERIAL_IDS.has(materialId) || !Number.isFinite(price) || price < 0) return data;
  return { ...data, crafting: { ...data.crafting, prices: { ...data.crafting.prices, [materialId]: price } } };
}

export function setCraftingRate(data: UserData, tierId: string, rate: number): UserData {
  if (!TIER_IDS.has(tierId) || !Number.isFinite(rate) || rate <= 0 || rate > 1) return data;
  return { ...data, crafting: { ...data.crafting, rates: { ...data.crafting.rates, [tierId]: rate } } };
}

export function setCraftingTax(data: UserData, tax: number): UserData {
  if (!Number.isFinite(tax) || tax < 0 || tax > 1) return data;
  return { ...data, crafting: { ...data.crafting, tax } };
}

export function resetCrafting(data: UserData): UserData {
  return { ...data, crafting: { prices: {}, rates: {} } };
}
```

Run: `pnpm test src/lib/crafting.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add crafting content and calculator logic

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: NumberField component

**Files:**
- Create: `src/components/number-field.tsx`
- Test: `src/components/number-field.test.tsx`

**Interfaces:**
- Produces: `<NumberField value: number; onCommit(value: number): void; min: number; max?: number; step?: number; label: string; suffix?: string; className?: string />`
  - It keeps a draft string while the user types.
  - On blur or Enter, it commits only a finite number within `[min, max]`. A comma counts as the decimal separator.
  - Anything else snaps back to `value`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/number-field.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NumberField } from "./number-field";

const setup = (props: Partial<React.ComponentProps<typeof NumberField>> = {}) => {
  const onCommit = vi.fn();
  render(<NumberField label="Price" value={1799} min={0} onCommit={onCommit} {...props} />);
  return { onCommit, input: screen.getByLabelText("Price") as HTMLInputElement, user: userEvent.setup() };
};

describe("NumberField", () => {
  it("commits a valid number on blur", async () => {
    const { onCommit, input, user } = setup();
    await user.clear(input);
    await user.type(input, "2000");
    await user.tab();
    expect(onCommit).toHaveBeenCalledWith(2000);
  });
  it("commits on Enter and accepts a decimal comma", async () => {
    const { onCommit, input, user } = setup({ value: 93.1, min: 0.1, max: 100 });
    await user.clear(input);
    await user.type(input, "93,5{Enter}");
    expect(onCommit).toHaveBeenCalledWith(93.5);
  });
  it("snaps back on garbage, empty or out-of-range input", async () => {
    const { onCommit, input, user } = setup({ max: 1000 });
    for (const bad of ["abc", "-5", "5000"]) {
      await user.clear(input);
      await user.type(input, bad);
      await user.tab();
      expect(input.value).toBe("1799");
    }
    await user.clear(input);
    await user.tab();
    expect(input.value).toBe("1799");
    expect(onCommit).not.toHaveBeenCalled();
  });
});
```

Run: `pnpm test src/components/number-field.test.tsx`
Expected: FAIL, because the module cannot be found.

- [ ] **Step 2: Implement**

```tsx
// src/components/number-field.tsx
"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onCommit(value: number): void;
  min: number;
  max?: number;
  step?: number;
  label: string;
  suffix?: string;
  className?: string;
};

// Keeps a draft while typing; commits on blur or Enter only when the number is valid, otherwise snaps back.
export function NumberField({ value, onCommit, min, max = Number.MAX_SAFE_INTEGER, step = 1, label, suffix, className }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const text = draft.replace(/\s/g, "").replace(",", ".");
    const n = Number(text);
    if (text !== "" && Number.isFinite(n) && n >= min && n <= max) onCommit(n);
    setDraft(null);
  };
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Input
        aria-label={label}
        inputMode="decimal"
        step={step}
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="min-h-11 w-28 text-right font-mono tabular-nums"
      />
      {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
    </span>
  );
}
```

Run: `pnpm test src/components/number-field.test.tsx`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add draft-and-commit NumberField

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Crafting page and navigation

**Files:**
- Modify: `messages/en.json`, `messages/it.json`, `src/components/shell/nav-items.ts`, `src/components/shell/sidebar.tsx`, `src/components/shell/bottom-nav.tsx`
- Create: `src/components/crafting/crafting-calculator.tsx`, `src/components/crafting/crafting-tips.tsx`, `src/app/[locale]/crafting/page.tsx`, `src/components/shell/nav-items.test.ts`
- Add shadcn: `tabs`

**Interfaces:**
- Consumes: `CRAFTING`, `CRAFTING_TIPS`, `computeCrafting`, the `set*` and `reset*` ops, `NumberField`, `useUserStore` and `localize`
- Produces:
  - `isNavActive(pathname: string, href: string): boolean`
  - a `crafting` entry in `NAV_ITEMS`
  - the `/crafting` page, which includes `data-testid="crafting-total"`

- [ ] **Step 1: Write the failing nav test**

```ts
// src/components/shell/nav-items.test.ts
import { describe, it, expect } from "vitest";
import { isNavActive } from "./nav-items";

describe("isNavActive", () => {
  it("matches home only exactly", () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/guides", "/")).toBe(false);
  });
  it("matches a section and its sub-pages", () => {
    expect(isNavActive("/guides", "/guides")).toBe(true);
    expect(isNavActive("/guides/roadmap", "/guides")).toBe(true);
    expect(isNavActive("/guidesx", "/guides")).toBe(false);
  });
});
```

Run: `pnpm test src/components/shell/nav-items.test.ts`
Expected: FAIL, because `isNavActive` is not exported.

- [ ] **Step 2: Update the navigation**

Replace `src/components/shell/nav-items.ts` with:

```ts
// src/components/shell/nav-items.ts
import { BookOpen, Hammer, Home, ListChecks, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", key: "home", icon: Home },
  { href: "/checklist", key: "checklist", icon: ListChecks },
  { href: "/crafting", key: "crafting", icon: Hammer },
  { href: "/guides", key: "guides", icon: BookOpen },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

export function isNavActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
```

The `guides` entry already points at `/guides`. That page arrives in Task 6, so until then the link gives a 404 on this branch, which is acceptable mid-branch.

In `src/components/shell/sidebar.tsx` and `src/components/shell/bottom-nav.tsx`:
- import `isNavActive` from `./nav-items`;
- replace every `pathname === href` with `isNavActive(pathname, href)`.

In `bottom-nav.tsx`, also change `grid-cols-3` to `grid-cols-5`.

Run: `pnpm test src/components/shell/nav-items.test.ts`
Expected: PASS.

- [ ] **Step 3: Add messages**

Add to `"nav"` in `messages/en.json`: `"crafting": "Crafting", "guides": "Guides"`. Add to `"nav"` in `messages/it.json`: `"crafting": "Crafting", "guides": "Guide"`.

Add a top-level `"crafting"` key to `messages/en.json`:

```json
  "crafting": {
    "title": "Crafting",
    "intro": "Estimate the kina needed to craft one True Dragon Lord item. Your prices and success rates are saved in this browser.",
    "tabs": { "calculator": "Calculator", "tips": "Crafting tips" },
    "baseCrafts": "{count} crafts needed at 100% success",
    "material": "Material",
    "qty": "Qty",
    "unitPrice": "Unit price",
    "costPerCraft": "Cost / craft",
    "expectedTotal": "Expected total",
    "successRate": "Success rate",
    "expectedCrafts": "Expected crafts",
    "tierTotal": "Tier total",
    "summary": "Cost estimate",
    "subtotal": "Materials subtotal",
    "tax": "Marketplace tax",
    "taxAmount": "Tax amount",
    "total": "Total kina",
    "reset": "Reset to defaults",
    "resetDone": "Defaults restored",
    "priceLabel": "Unit price of {material}",
    "rateLabel": "Success rate for {tier}",
    "taxLabel": "Marketplace tax rate",
    "tips": {
      "base": "Base crafting",
      "baseTier": "Craft",
      "baseItem": "With a 25% combo",
      "baseNeeded": "Needed for True Dragon Lord (avg.)",
      "transfer": "Transfer crafting",
      "transferItem": "Item",
      "transferResult": "Becomes",
      "upgradeOnly": "Upgrade only",
      "carryOver": "What carries over when transfer crafting?",
      "carries": "Carries over",
      "lost": "Lost",
      "misc": "Other crafting info",
      "compare": "Crafted vs Expedition"
    }
  }
```

Add the matching top-level `"crafting"` key to `messages/it.json`:

```json
  "crafting": {
    "title": "Crafting",
    "intro": "Stima i kina necessari per craftare un oggetto True Dragon Lord. Prezzi e probabilità di successo vengono salvati in questo browser.",
    "tabs": { "calculator": "Calcolatore", "tips": "Consigli di crafting" },
    "baseCrafts": "{count} craft necessari con successo al 100%",
    "material": "Materiale",
    "qty": "Q.tà",
    "unitPrice": "Prezzo unitario",
    "costPerCraft": "Costo / craft",
    "expectedTotal": "Totale previsto",
    "successRate": "Probabilità di successo",
    "expectedCrafts": "Craft previsti",
    "tierTotal": "Totale del tier",
    "summary": "Stima dei costi",
    "subtotal": "Subtotale materiali",
    "tax": "Tassa del mercato",
    "taxAmount": "Importo della tassa",
    "total": "Totale kina",
    "reset": "Ripristina i valori predefiniti",
    "resetDone": "Valori predefiniti ripristinati",
    "priceLabel": "Prezzo unitario di {material}",
    "rateLabel": "Probabilità di successo per {tier}",
    "taxLabel": "Percentuale della tassa del mercato",
    "tips": {
      "base": "Crafting base",
      "baseTier": "Craft",
      "baseItem": "Con combo al 25%",
      "baseNeeded": "Necessari per True Dragon Lord (media)",
      "transfer": "Transfer crafting",
      "transferItem": "Oggetto",
      "transferResult": "Diventa",
      "upgradeOnly": "Solo potenziamento",
      "carryOver": "Cosa si mantiene con il transfer crafting?",
      "carries": "Si mantiene",
      "lost": "Si perde",
      "misc": "Altre info sul crafting",
      "compare": "Craftato vs Expedition"
    }
  }
```

Run: `pnpm test tests/i18n-keys.test.ts`
Expected: PASS.

- [ ] **Step 4: Add the tabs component**

Run: `pnpm dlx shadcn@latest add -y tabs`

Check the generated exports: `Tabs`, `TabsList`, `TabsTrigger` and `TabsContent`. These are Base UI tabs, so `defaultValue` and `value` work as they do with Radix.

- [ ] **Step 5: Create the calculator, tips and page**

```tsx
// src/components/crafting/crafting-calculator.tsx
"use client";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useUserStore } from "@/store/user-store";
import { CRAFTING, computeCrafting, resetCrafting, setCraftingPrice, setCraftingRate, setCraftingTax } from "@/lib/crafting";
import { localize } from "@/lib/activities";
import { NumberField } from "@/components/number-field";
import { Button } from "@/components/ui/button";

const percent = (x: number) => Math.round(x * 1000) / 10;

export function CraftingCalculator() {
  const t = useTranslations("crafting");
  const locale = useLocale();
  const overrides = useUserStore((s) => s.data.crafting);
  const hydrated = useUserStore((s) => s.hydrated);
  const update = useUserStore((s) => s.update);
  if (!hydrated) return <div className="h-96 animate-pulse rounded-xl bg-card" />;

  const kina = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const dec = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const r = computeCrafting(CRAFTING, overrides);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4">
        {r.tiers.map((tier) => {
          const name = localize(tier.name, locale);
          return (
            <section key={tier.id} aria-labelledby={`tier-${tier.id}`} className="rounded-xl border border-border bg-card p-4">
              <header className="mb-3 flex flex-wrap items-baseline gap-x-3">
                <h2 id={`tier-${tier.id}`} className="font-display text-lg font-semibold">{name}</h2>
                <span className="text-xs text-muted-foreground">{t("baseCrafts", { count: tier.crafts })}</span>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="py-1 text-left font-normal">{t("material")}</th>
                      <th className="py-1 text-right font-normal">{t("qty")}</th>
                      <th className="py-1 text-right font-normal">{t("unitPrice")}</th>
                      <th className="py-1 text-right font-normal">{t("costPerCraft")}</th>
                      <th className="py-1 text-right font-normal">{t("expectedTotal")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tier.materials.map((m) => (
                      <tr key={m.id} className="border-t border-border/60">
                        <th scope="row" className="py-1 pr-2 text-left font-normal">{m.name}</th>
                        <td className="text-right font-mono tabular-nums">{m.qty}</td>
                        <td className="py-1 text-right">
                          <NumberField label={t("priceLabel", { material: m.name })} value={m.price} min={0} onCommit={(v) => update((d) => setCraftingPrice(d, m.id, v))} />
                        </td>
                        <td className="text-right font-mono tabular-nums">{kina.format(m.cost)}</td>
                        <td className="text-right font-mono tabular-nums">{kina.format(m.expected)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-3 text-sm">
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t("successRate")}</span>
                  <NumberField label={t("rateLabel", { tier: name })} value={percent(tier.rate)} min={0.1} max={100} step={0.1} suffix="%"
                    onCommit={(v) => update((d) => setCraftingRate(d, tier.id, v / 100))} />
                </span>
                <span>
                  <span className="text-muted-foreground">{t("expectedCrafts")}</span>{" "}
                  <span className="font-mono tabular-nums">{dec.format(tier.expectedCrafts)}</span>
                </span>
                <span className="ml-auto">
                  <span className="text-muted-foreground">{t("tierTotal")}</span>{" "}
                  <span className="font-mono tabular-nums text-primary">{kina.format(tier.total)}</span>
                </span>
              </footer>
            </section>
          );
        })}
      </div>

      <aside aria-labelledby="crafting-summary" className="space-y-3 rounded-xl border border-border bg-card p-4 lg:sticky lg:top-20">
        <h2 id="crafting-summary" className="font-display text-lg font-semibold">{t("summary")}</h2>
        <dl className="space-y-1 text-sm">
          {r.tiers.map((tier) => (
            <div key={tier.id} className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{localize(tier.name, locale)}</dt>
              <dd className="font-mono tabular-nums">{kina.format(tier.total)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-2 border-t border-border pt-1">
            <dt>{t("subtotal")}</dt>
            <dd className="font-mono tabular-nums">{kina.format(r.subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt>{t("tax")}</dt>
            <dd>
              <NumberField label={t("taxLabel")} value={percent(r.tax)} min={0} max={100} step={0.1} suffix="%" onCommit={(v) => update((d) => setCraftingTax(d, v / 100))} />
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t("taxAmount")}</dt>
            <dd className="font-mono tabular-nums">{kina.format(r.taxAmount)}</dd>
          </div>
        </dl>
        <div className="border-t border-border pt-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("total")}</p>
          <p data-testid="crafting-total" className="font-mono text-3xl tabular-nums text-primary">{kina.format(r.total)}</p>
        </div>
        <Button variant="outline" className="min-h-11 w-full" onClick={() => { update(resetCrafting); toast.success(t("resetDone")); }}>
          {t("reset")}
        </Button>
      </aside>
    </div>
  );
}
```

```tsx
// src/components/crafting/crafting-tips.tsx
import { Check, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { CRAFTING_TIPS } from "@/lib/crafting";
import { localize } from "@/lib/activities";

export function CraftingTips() {
  const t = useTranslations("crafting.tips");
  const locale = useLocale();
  const L = (x: { en: string; it: string }) => localize(x, locale);
  const card = "rounded-xl border border-border bg-card p-4";
  const h = "mb-3 font-display text-lg font-semibold";
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className={card}>
        <h2 className={h}>{t("base")}</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="text-left font-normal">{t("baseTier")}</th>
              <th className="text-left font-normal">{t("baseItem")}</th>
              <th className="text-right font-normal">{t("baseNeeded")}</th>
            </tr>
          </thead>
          <tbody>
            {CRAFTING_TIPS.base.map((b) => (
              <tr key={b.item} className="border-t border-border/60">
                <th scope="row" className="py-1 text-left font-normal">{L(b.tier)}</th>
                <td>{b.item}</td>
                <td className="text-right font-mono tabular-nums">{b.needed ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className={card}>
        <h2 className={h}>{t("transfer")}</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="text-left font-normal">{t("transferItem")}</th>
              <th className="text-left font-normal">{t("transferResult")}</th>
            </tr>
          </thead>
          <tbody>
            {CRAFTING_TIPS.transfer.map((x) => (
              <tr key={x.item} className="border-t border-border/60">
                <th scope="row" className="py-1 text-left font-normal">{x.item}</th>
                <td className={x.result ? "" : "text-muted-foreground"}>{x.result ?? t("upgradeOnly")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className={card}>
        <h2 className={h}>{t("carryOver")}</h2>
        <ul className="space-y-1 text-sm">
          {CRAFTING_TIPS.carryOver.map((c) => (
            <li key={c.label.en} className="flex items-center justify-between gap-2 border-t border-border/60 py-1">
              <span>{L(c.label)}</span>
              <span className={c.carries ? "flex items-center gap-1 text-primary" : "flex items-center gap-1 text-muted-foreground"}>
                {c.carries ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
                {c.carries ? t("carries") : t("lost")}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className={card}>
        <h2 className={h}>{t("misc")}</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          {CRAFTING_TIPS.misc.map((m) => <li key={m.en}>{L(m)}</li>)}
        </ul>
      </section>
      {CRAFTING_TIPS.images.length > 0 && (
        <section className={`${card} lg:col-span-2`}>
          <h2 className={h}>{t("compare")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {CRAFTING_TIPS.images.map((img) => (
              <figure key={img.src} className="space-y-1">
                <a href={img.src} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- screenshots of unknown size */}
                  <img src={img.src} alt={L(img.label)} loading="lazy" className="w-full rounded-lg border border-border" />
                </a>
                <figcaption className="text-sm text-muted-foreground">{L(img.label)}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

```tsx
// src/app/[locale]/crafting/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CraftingCalculator } from "@/components/crafting/crafting-calculator";
import { CraftingTips } from "@/components/crafting/crafting-tips";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "crafting" });
  return { title: t("title") };
}

export default async function CraftingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("crafting");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
        <p className="max-w-prose text-muted-foreground">{t("intro")}</p>
      </header>
      <Tabs defaultValue="calculator" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calculator" className="min-h-11">{t("tabs.calculator")}</TabsTrigger>
          <TabsTrigger value="tips" className="min-h-11">{t("tabs.tips")}</TabsTrigger>
        </TabsList>
        <TabsContent value="calculator"><CraftingCalculator /></TabsContent>
        <TabsContent value="tips"><CraftingTips /></TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 6: Verify**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: every command exits 0, and the build lists `/en/crafting` and `/it/crafting`.

Then check in `pnpm dev`:
- `/en/crafting` shows a total of `30,477,639`, and `/it/crafting` shows `30.477.639`.
- Changing the Common Material price to `2000` and pressing Enter changes the total to `30,492,838`.
- A rate of `0` snaps back.
- "Reset to defaults" restores `30,477,639`.
- The Tips tab shows four cards, plus the images if any were extracted.
- The sidebar shows Crafting as active.
- The bottom nav has 5 items at 375 px.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add crafting calculator page with tips and navigation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Guide content and logic

**Files:**
- Create:
  - `content/guides/content-guide.json`, `roadmap.json`, `tips.json`, `buffs.json`, `links.json`
  - `src/lib/guides.ts`
- Modify: `src/lib/activities.ts` (optional `guide` field), `content/activities.json`
- Test: `src/lib/guides.test.ts`

**Interfaces:**
- Consumes: `FullTextSchema`, `localize`, `CLASSES`, `Activity` and `UserData`
- Produces:
  - `GUIDE_SECTIONS = ["daily","weekly","recharge","misc"] as const` and `type GuideSection`
  - `GUIDE_PAGES = ["content","roadmap","tips","buffs","links"] as const`
  - `type GuideEntry`, `CONTENT_GUIDE: GuideEntry[]` and `GUIDE_BY_ID: Map<string, GuideEntry>`
  - `guideFor(a: Activity): GuideEntry | undefined`
  - `type GuideFilter = { section: "all" | GuideSection; mode: "all" | "pve" | "pvp"; scope: "all" | "main" | "alt"; q: string }`
  - `filterGuide(entries, filter, locale): GuideEntry[]`
  - `ROADMAP` and `ROADMAP_STEP_IDS: ReadonlySet<string>`
  - `roadmapProgress(done: string[], steps?): { done: number; total: number }`
  - `toggleRoadmapItem(data: UserData, id: string): UserData`
  - `TIPS`, `BUFFS` and `LINKS`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/guides.test.ts
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  CONTENT_GUIDE, GUIDE_BY_ID, ROADMAP, ROADMAP_STEP_IDS, TIPS, BUFFS, LINKS,
  filterGuide, guideFor, roadmapProgress, toggleRoadmapItem, type GuideFilter,
} from "./guides";
import { ACTIVITIES } from "./activities";
import { createDefaultUserData } from "./user-data";

const ALL: GuideFilter = { section: "all", mode: "all", scope: "all", q: "" };
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe("content guide data", () => {
  it("has the 24 activities of the sheet, by section", () => {
    expect(CONTENT_GUIDE).toHaveLength(24);
    const by = (s: string) => CONTENT_GUIDE.filter((e) => e.section === s).length;
    expect([by("daily"), by("weekly"), by("recharge"), by("misc")]).toEqual([1, 8, 6, 9]);
  });
  it("only references image files that exist", () => {
    for (const e of CONTENT_GUIDE) if (e.icon) expect(existsSync(join("public", e.icon)), e.icon).toBe(true);
    for (const img of TIPS.settings.images) expect(existsSync(join("public", img.src)), img.src).toBe(true);
  });
  it("every explicit activity → guide link resolves", () => {
    for (const a of ACTIVITIES) if (a.guide) expect(GUIDE_BY_ID.has(a.guide), a.id).toBe(true);
    expect(guideFor(ACTIVITIES.find((a) => a.id === "shugo-festival-key")!)?.id).toBe("shugo-festival-reward-key");
    expect(guideFor(ACTIVITIES.find((a) => a.id === "conquest")!)).toBeUndefined();
  });
  it("buffs and links are populated", () => {
    expect(BUFFS.pairs).toHaveLength(3);
    expect(LINKS.classes.length).toBeGreaterThanOrEqual(7);
    expect(ROADMAP.phases.length).toBeGreaterThanOrEqual(5);
  });
});

describe("filterGuide", () => {
  it("filters by section", () => {
    const r = ids(filterGuide(CONTENT_GUIDE, { ...ALL, section: "recharge" }, "en"));
    expect(r).toContain("nightmare");
    expect(r).not.toContain("duty-missions");
  });
  it("filters by mode and drops entries without one", () => {
    const r = filterGuide(CONTENT_GUIDE, { ...ALL, mode: "pvp" }, "en");
    expect(r.every((e) => e.modes.includes("pvp"))).toBe(true);
    expect(ids(r)).toContain("battlefield");
    expect(ids(r)).not.toContain("substance-morph");
  });
  it("alt scope excludes main-only activities", () => {
    const r = ids(filterGuide(CONTENT_GUIDE, { ...ALL, scope: "alt" }, "en"));
    expect(r).not.toContain("duty-missions");
    expect(r).toContain("nightmare");
  });
  it("searches names and localized text, case-insensitively", () => {
    expect(ids(filterGuide(CONTENT_GUIDE, { ...ALL, q: "NIGHTMARE" }, "en"))).toContain("nightmare");
    const it_ = GUIDE_BY_ID.get("duty-missions")!.strategy.it.split(" ").find((w) => w.length > 6)!;
    expect(ids(filterGuide(CONTENT_GUIDE, { ...ALL, q: it_.toUpperCase() }, "it"))).toContain("duty-missions");
  });
  it("returns an empty list when nothing matches", () => {
    expect(filterGuide(CONTENT_GUIDE, { ...ALL, q: "zzzz-no-match" }, "en")).toEqual([]);
  });
});

describe("roadmap progress", () => {
  const first = [...ROADMAP_STEP_IDS][0];
  it("counts only known steps", () => {
    expect(roadmapProgress([first, "old-removed-step"])).toEqual({ done: 1, total: ROADMAP_STEP_IDS.size });
  });
  it("toggles known steps and ignores unknown ids", () => {
    const d = createDefaultUserData(new Date("2026-10-14T10:00:00.000Z"));
    const on = toggleRoadmapItem(d, first);
    expect(on.roadmap.done).toEqual([first]);
    expect(toggleRoadmapItem(on, first).roadmap.done).toEqual([]);
    expect(toggleRoadmapItem(d, "old-removed-step")).toBe(d);
  });
});
```

Run: `pnpm test src/lib/guides.test.ts`
Expected: FAIL, because the module cannot be found.

- [ ] **Step 2: Link activities to the Content Guide**

In `src/lib/activities.ts`, add `guide` to `ActivitySchema`, after `note`:

```ts
  guide: z.string().regex(/^[a-z0-9-]+$/).optional(), // Content Guide id, when it differs from the activity id
```

In `content/activities.json`, add the following fields:

| Activity | Field to add |
|---|---|
| `supply-requests-daily` | `"guide": "supply-requests"` |
| `supply-requests-weekly` | `"guide": "supply-requests"` |
| `shugo-festival-key` | `"guide": "shugo-festival-reward-key"` |

No other activity needs one. Matching ids resolve automatically, and Sanctuary and Conquest have no entry.

- [ ] **Step 3: Implement `src/lib/guides.ts`**

```ts
// src/lib/guides.ts
import { z } from "zod";
import guideRaw from "@content/guides/content-guide.json";
import roadmapRaw from "@content/guides/roadmap.json";
import tipsRaw from "@content/guides/tips.json";
import buffsRaw from "@content/guides/buffs.json";
import linksRaw from "@content/guides/links.json";
import { FullTextSchema } from "./text";
import { localize, type Activity } from "./activities";
import { CLASSES } from "./classes";
import type { UserData } from "./user-data";

const Id = z.string().regex(/^[a-z0-9-]+$/);
const Url = z.url().refine((u) => u.startsWith("https://"), "https only");
const Asset = z.string().regex(/^\/guides\/[a-z0-9/-]+\.(png|jpe?g|webp|gif)$/);
const unique = <T,>(items: T[], key: (t: T) => string) => new Set(items.map(key)).size === items.length;

export const GUIDE_SECTIONS = ["daily", "weekly", "recharge", "misc"] as const;
export type GuideSection = (typeof GUIDE_SECTIONS)[number];
export const GUIDE_PAGES = ["content", "roadmap", "tips", "buffs", "links"] as const;

const GuideEntrySchema = z.object({
  id: Id,
  name: z.string().min(1),
  section: z.enum(GUIDE_SECTIONS),
  type: FullTextSchema,
  scope: z.enum(["main", "alt", "both"]),
  modes: z.array(z.enum(["pve", "pvp"])),
  count: FullTextSchema,
  rewards: z.string(),
  requirements: FullTextSchema,
  where: z.string(),
  strategy: FullTextSchema,
  notes: FullTextSchema.optional(),
  icon: Asset.optional(),
});
export type GuideEntry = z.infer<typeof GuideEntrySchema>;

export const CONTENT_GUIDE = z.array(GuideEntrySchema).refine((a) => unique(a, (e) => e.id), "duplicate guide ids").parse(guideRaw);
export const GUIDE_BY_ID = new Map(CONTENT_GUIDE.map((e) => [e.id, e]));

export function guideFor(a: Activity): GuideEntry | undefined {
  return GUIDE_BY_ID.get(a.guide ?? a.id);
}

export type GuideFilter = { section: "all" | GuideSection; mode: "all" | "pve" | "pvp"; scope: "all" | "main" | "alt"; q: string };

export function filterGuide(entries: GuideEntry[], f: GuideFilter, locale: string): GuideEntry[] {
  const q = f.q.trim().toLowerCase();
  return entries.filter((e) => {
    if (f.section !== "all" && e.section !== f.section) return false;
    if (f.mode !== "all" && !e.modes.includes(f.mode)) return false;
    if (f.scope !== "all" && e.scope !== f.scope && e.scope !== "both") return false;
    if (!q) return true;
    const texts = [e.type, e.count, e.requirements, e.strategy, e.notes].flatMap((x) => (x ? [localize(x, locale)] : []));
    return [e.name, e.rewards, e.where, ...texts].some((s) => s.toLowerCase().includes(q));
  });
}

const RoadmapSchema = z
  .object({
    phases: z
      .array(
        z.object({
          id: Id,
          title: FullTextSchema,
          intro: FullTextSchema.optional(),
          items: z
            .array(z.object({ id: Id, text: FullTextSchema, kind: z.enum(["step", "note", "warning"]).default("step"), url: Url.optional() }))
            .min(1),
        }),
      )
      .min(1),
    systems: z.array(FullTextSchema),
    targets: z.array(FullTextSchema),
  })
  .refine((r) => unique(r.phases.flatMap((p) => p.items), (i) => i.id), "duplicate roadmap item ids");

export const ROADMAP = RoadmapSchema.parse(roadmapRaw);
export const ROADMAP_STEP_IDS: ReadonlySet<string> = new Set(
  ROADMAP.phases.flatMap((p) => p.items.filter((i) => i.kind === "step").map((i) => i.id)),
);

// Ids removed by a content update stay in storage but never count.
export function roadmapProgress(done: string[], steps: ReadonlySet<string> = ROADMAP_STEP_IDS) {
  return { done: new Set(done.filter((id) => steps.has(id))).size, total: steps.size };
}

export function toggleRoadmapItem(data: UserData, id: string): UserData {
  if (!ROADMAP_STEP_IDS.has(id)) return data;
  const done = data.roadmap.done.includes(id) ? data.roadmap.done.filter((x) => x !== id) : [...data.roadmap.done, id];
  return { ...data, roadmap: { done } };
}

export const TIPS = z
  .object({
    tips: z.array(z.object({ id: Id, text: FullTextSchema })).min(1),
    settings: z.object({ intro: FullTextSchema, images: z.array(z.object({ src: Asset, alt: FullTextSchema })) }),
    links: z.array(z.object({ label: FullTextSchema, url: Url })),
  })
  .parse(tipsRaw);

const Buff = z.object({ name: z.string().min(1), detail: FullTextSchema.optional(), effects: z.array(FullTextSchema).min(1) });
export const BUFFS = z
  .object({
    intro: FullTextSchema,
    differences: z.object({ chanter: z.array(FullTextSchema), cleric: z.array(FullTextSchema) }),
    comp: FullTextSchema,
    pairs: z.array(z.object({ chanter: Buff.nullable(), cleric: Buff.nullable() })),
  })
  .parse(buffsRaw);

const CLASS_IDS = CLASSES.map((c) => c.id) as [string, ...string[]];
export const LINKS = z
  .object({
    classes: z.array(
      z.object({
        classId: z.enum(CLASS_IDS),
        guides: z.array(z.object({ label: FullTextSchema, url: Url })),
        creators: z.array(z.object({ name: z.string().min(1), url: Url })),
      }),
    ),
    tools: z.array(z.object({ label: FullTextSchema, url: Url })),
  })
  .parse(linksRaw);
```

- [ ] **Step 4: Create `content/guides/buffs.json`**

Transcribed from sheet 1, tab "Chanter+Cleric".

```json
{
  "intro": { "en": "The first 2 buffs of Chanter and Cleric don't stack. The Chanter one takes priority.", "it": "I primi 2 buff di Chanter e Cleric non si sommano. Ha la priorità quello del Chanter." },
  "differences": {
    "chanter": [
      { "en": "Extra 200 Critical Hit and 200 Accuracy", "it": "200 Critical Hit e 200 Accuracy in più" },
      { "en": "10% Critical Damage", "it": "10% di Critical Damage" },
      { "en": "20% Combat Speed", "it": "20% di Combat Speed" },
      { "en": "20% Movement Speed", "it": "20% di Movement Speed" },
      { "en": "10% CDR", "it": "10% di CDR" },
      { "en": "5% Weapon Damage Boost", "it": "5% di Weapon Damage Boost" },
      { "en": "5% Endurance", "it": "5% di Endurance" }
    ],
    "cleric": [
      { "en": "20% Max HP", "it": "20% di Max HP" },
      { "en": "Extra 10% Double Chance", "it": "10% di Double Chance in più" },
      { "en": "10% Defense", "it": "10% di Defense" },
      { "en": "Stronger heals for progression content", "it": "Cure più forti per i contenuti di progressione" },
      { "en": "Has a resurrection", "it": "Ha una resurrezione" },
      { "en": "Extra 5% Attack", "it": "5% di Attack in più" }
    ]
  },
  "comp": { "en": "The meta comp takes both, and the Cleric turns off Light of Protection for more heals, shields and self damage.", "it": "La comp meta li porta entrambi e il Cleric disattiva Light of Protection per avere più cure, scudi e danni propri." },
  "pairs": [
    {
      "chanter": { "name": "Undefeated Mantra", "detail": { "en": "Toggle", "it": "Attivabile" }, "effects": [
        { "en": "22.5% PvE Damage & Tolerance", "it": "22,5% di PvE Damage e Tolerance" },
        { "en": "200 Critical Hit", "it": "200 Critical Hit" },
        { "en": "200 Accuracy", "it": "200 Accuracy" },
        { "en": "10% Critical Damage", "it": "10% di Critical Damage" },
        { "en": "10% Double Chance", "it": "10% di Double Chance" },
        { "en": "20% Perfect Chance", "it": "20% di Perfect Chance" }
      ] },
      "cleric": { "name": "Light of Protection", "detail": { "en": "Toggle", "it": "Attivabile" }, "effects": [
        { "en": "22.5% PvE Damage & Tolerance", "it": "22,5% di PvE Damage e Tolerance" },
        { "en": "20% Incoming Heal", "it": "20% di Incoming Heal" },
        { "en": "200 Accuracy", "it": "200 Accuracy" },
        { "en": "20% Max HP", "it": "20% di Max HP" },
        { "en": "10% Double Chance", "it": "10% di Double Chance" },
        { "en": "20% Perfect Chance", "it": "20% di Perfect Chance" }
      ] }
    },
    {
      "chanter": { "name": "Power of the Storm", "detail": { "en": "Lasts 22.5 s, 1 min cooldown", "it": "Dura 22,5 s, ricarica 1 min" }, "effects": [
        { "en": "20% Combat Speed", "it": "20% di Combat Speed" },
        { "en": "200 Accuracy", "it": "200 Accuracy" },
        { "en": "200 Critical Hit", "it": "200 Critical Hit" },
        { "en": "10% CDR", "it": "10% di CDR" },
        { "en": "5% Attack", "it": "5% di Attack" },
        { "en": "10% Weapon Damage Boost", "it": "10% di Weapon Damage Boost" }
      ] },
      "cleric": { "name": "Earth's Blessing", "detail": { "en": "Lasts 20 s, 30 s cooldown", "it": "Dura 20 s, ricarica 30 s" }, "effects": [
        { "en": "10% Double Chance", "it": "10% di Double Chance" },
        { "en": "10% Defense", "it": "10% di Defense" },
        { "en": "10% Attack", "it": "10% di Attack" }
      ] }
    },
    {
      "chanter": { "name": "Sprint Mantra", "detail": { "en": "Toggle", "it": "Attivabile" }, "effects": [
        { "en": "20–22.5% Movement Speed", "it": "20–22,5% di Movement Speed" },
        { "en": "20% Incoming Heal", "it": "20% di Incoming Heal" },
        { "en": "60% Natural Stamina", "it": "60% di Natural Stamina" },
        { "en": "20% Restoration", "it": "20% di Restoration" },
        { "en": "15% chance to restore 615–677 HP when landing an attack (heals 200% more at 50% HP or lower)", "it": "15% di probabilità di recuperare 615–677 HP quando colpisci (cura il 200% in più con HP al 50% o meno)" },
        { "en": "5% Endurance", "it": "5% di Endurance" }
      ] },
      "cleric": { "name": "Summon Resurrection", "detail": { "en": "1–2 min cooldown", "it": "Ricarica 1–2 min" }, "effects": [
        { "en": "Resurrects all fallen party members and grants 3–11 s of invincibility after resurrection", "it": "Resuscita tutti i membri del party caduti e concede 3–11 s di invincibilità dopo la resurrezione" },
        { "en": "Restores 20% of Max HP", "it": "Ripristina il 20% di Max HP" },
        { "en": "Not an extra res: it just saves you stones", "it": "Non è una res in più: ti fa solo risparmiare pietre" }
      ] }
    }
  ]
}
```

- [ ] **Step 5: Create `content/guides/links.json`**

Transcribed from sheet 1, tab "Class Guides". The sheet has no Chanter entry.

```json
{
  "classes": [
    { "classId": "ranger",
      "guides": [
        { "label": { "en": "Written guide (Google Docs)", "it": "Guida scritta (Google Docs)" }, "url": "https://docs.google.com/document/d/1GwcOMFMMJj9eHrsYp-OVtddBxfQhNOjAzmV1eOkmiAk/edit?usp=sharing" },
        { "label": { "en": "Daevanion board planner", "it": "Planner del Daevanion board" }, "url": "https://ranger.tgustafsson.se/" }
      ],
      "creators": [
        { "name": "j0eitv", "url": "https://www.twitch.tv/j0eitv" },
        { "name": "thewhelps", "url": "https://www.twitch.tv/thewhelps" },
        { "name": "johnpal", "url": "https://www.twitch.tv/johnpal" }
      ] },
    { "classId": "gladiator",
      "guides": [{ "label": { "en": "Written guide (Google Docs)", "it": "Guida scritta (Google Docs)" }, "url": "https://docs.google.com/document/d/15J0xIIlOGvp0NSGui7NK0MJpbgZTjXuZKAahHnkr2G4/edit?tab=t.refyxxrthj80" }],
      "creators": [{ "name": "kanonxo", "url": "https://www.twitch.tv/kanonxo" }] },
    { "classId": "sorcerer",
      "guides": [
        { "label": { "en": "Written guide (Google Docs)", "it": "Guida scritta (Google Docs)" }, "url": "https://docs.google.com/document/d/1XVciQ8mC7bHo7bAApRk7hLwmT61MxVWTm2III6rUzsM/edit?usp=sharing" },
        { "label": { "en": "PvE guide (Notion)", "it": "Guida PvE (Notion)" }, "url": "https://app.notion.com/p/AION2-Sorcerer-PVE-Guide-3c61a9239eae81cf8c6bdb3716a00869" }
      ],
      "creators": [{ "name": "stoopzz", "url": "https://www.twitch.tv/stoopzz" }] },
    { "classId": "spirit-master",
      "guides": [{ "label": { "en": "Written guide (Google Docs)", "it": "Guida scritta (Google Docs)" }, "url": "https://docs.google.com/document/d/16RBdqrTCKJ4TZJNEkYri9hLYcMv-Hle2pW6HXSNCX7c/edit?tab=t.0" }],
      "creators": [] },
    { "classId": "templar",
      "guides": [{ "label": { "en": "How not to brick your account (Notion)", "it": "Come non rovinare il tuo account (Notion)" }, "url": "https://app.notion.com/p/Templar-s-Guide-How-Not-to-Brick-Your-Account-037d77a0f9b643d0af3fca41da45c7de" }],
      "creators": [
        { "name": "axely", "url": "https://www.twitch.tv/axely" },
        { "name": "youmadsin", "url": "https://www.twitch.tv/youmadsin" }
      ] },
    { "classId": "cleric",
      "guides": [{ "label": { "en": "Video guide (YouTube)", "it": "Video guida (YouTube)" }, "url": "https://youtu.be/KptUtnv35vk" }],
      "creators": [{ "name": "youmadsin", "url": "https://www.twitch.tv/youmadsin" }] },
    { "classId": "assassin",
      "guides": [
        { "label": { "en": "Web guide", "it": "Guida web" }, "url": "https://aion2-assassin-guide.onrender.com/kd-fate" },
        { "label": { "en": "Daevanion board planner", "it": "Planner del Daevanion board" }, "url": "https://assassin.tgustafsson.se/" }
      ],
      "creators": [
        { "name": "wolves", "url": "https://www.twitch.tv/wolves" },
        { "name": "thehoned", "url": "https://www.twitch.tv/thehoned" }
      ] }
  ],
  "tools": [
    { "label": { "en": "Daevanion boards and skill builder (questlog.gg)", "it": "Daevanion board e skill builder (questlog.gg)" }, "url": "https://questlog.gg/aion-2/en/skill-builder" },
    { "label": { "en": "Castform's class guides on DaevaOS", "it": "Guide di classe di Castform su DaevaOS" }, "url": "https://daevaos.com/guides/classes?author=Castform" }
  ]
}
```

- [ ] **Step 6: Transcribe `content/guides/content-guide.json`, `roadmap.json` and `tips.json` from the source dumps**

This is data entry. The text is long, so it is not repeated here. Read the full cell values from the dump files named in Global Constraints. A throwaway script in the scratchpad is fine, but don't commit it. Apply the Translation rules to every `it`. The schema in Step 3 and the tests in Step 1 are the acceptance check.

**`content-guide.json`** comes from sheet 2, tab "Content Guide": an array of `GuideEntry`.

| Rows | Section |
|---|---|
| 3 | `daily` |
| 5–12 | `weekly` |
| 14–19 | `recharge` |
| 21–29 | `misc` |

Rows 1, 2, 4, 13 and 20 are header rows. That gives 24 entries, in sheet order. Fill each entry's fields like this:

| Field | Source | Rule |
|---|---|---|
| `name` | column A | Fix typos (Transcendance → Transcendence). |
| `id` | `name` | Slugify (`[^a-z0-9]+` → `-`, trimmed). Supply Requests becomes `supply-requests`. |
| `type` | C | Translated. |
| `scope` | D | Main → `main`, Alt → `alt`, Both → `both`. |
| `modes` | E | PvE → `["pve"]`, PvP → `["pvp"]`, PvEvP or Both → `["pve","pvp"]`, N/A or Exploration → `[]`. |
| `count` | F | Translated. Fix "Weeky". |
| `rewards` | G | Plain string. Game names stay in English. |
| `requirements` | H | Translated. |
| `where` | I | Plain string (a UI path). |
| `strategy` | J | Translated. |
| `notes` | K | Translated. Omit when empty. |
| `icon` | Task 1 output | `/guides/content/<id>.png`, only if that file exists. |

**`roadmap.json`** comes from sheet 1, tab "Roadmap", column A. Number item ids `<phase-id>-<n>` from 1, in row order. Shorten the phase titles as listed below and translate them.

| Phase | Title (en / it) | Intro | Items (row → kind) |
|---|---|---|---|
| `msq` | Main story to level 45 / Storia principale fino al livello 45 | A2 | A3 step, A4 step, A5 step, A6 note, A7 step, A8 step |
| `level-45` | At level 45 / Al livello 45 | A10 | A11–A18 step, A19 note |
| `gear-1000` | Around 1,000 gear score / Intorno a 1.000 di gear score | — | A21 step, A22 step, A24 note |
| `gear-1400` | At ~1,400 gear score / A ~1.400 di gear score | A26 | A27 step, A28 warning, A32 step, A34 step |
| `gear-1600` | At 1,600 gear score / A 1.600 di gear score | — | A35 step, A37 step, A38 step |
| `gear-1900` | At 1,900 gear score / A 1.900 di gear score | — | A41 step, A42 step |
| `gear-2000` | At 2,000 gear score / A 2.000 di gear score | — | A44 step with `url` from the cell link (`https://www.twitch.tv/videos/2892131227`) |

Remove the leading numbering ("1. ", "2. ") from item text. The UI provides the order.

`systems` is B3–B10 and B12, translated. Keep game names: Stigma Points, Skill Points, Board, Soulbinding, Pet Genus, Pantheon, Ludra.

`targets` is B13–B16, translated, for example "Weapon, Guard, Rings to +17" → "Weapon, Guard e Rings a +17".

**`tips.json`** comes from sheet 1, tab "Tips(+settings)".
- **`tips`:** A2 → `tip-1`, A11 → `tip-2`, A13 → `tip-3`, with full text. Strip the leading "#1 " or "2. " numbering, keep the line breaks, and rewrite all-caps sentences in normal case in both languages.
- **`settings.intro`:** A15 without "4. ".
- **`settings.images`:** one entry per `public/guides/tips/setting-N.*` from Task 1, in order, with `alt` `{ "en": "Settings screenshot N", "it": "Screenshot delle impostazioni N" }`.
- **`links`:** A83, label `{ "en": "Settings that made Aion 2 feel much better (Reddit)", "it": "Impostazioni che migliorano molto Aion 2 (Reddit)" }`. Use the URL from the cell link.

Run: `pnpm test src/lib/guides.test.ts`
Expected: PASS. If the counts fail, recount the source rows. Never change the expected numbers to make the test pass.

- [ ] **Step 7: Run the whole suite, then commit**

Run: `pnpm test && pnpm typecheck`
Expected: every test passes and the typecheck is clean.

```bash
git add -A
git commit -m "feat: add translated guide content and guide logic

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Guides pages

**Files:**
- Modify: `messages/en.json`, `messages/it.json`
- Create:
  - `src/components/guides/guide-content-view.tsx`, `src/components/guides/roadmap-view.tsx`
  - under `src/app/[locale]/guides/`: `page.tsx`, `content/page.tsx`, `roadmap/page.tsx`, `tips/page.tsx`, `buffs/page.tsx` and `links/page.tsx`

**Interfaces:**
- Consumes: everything Task 5 produces, plus `useUserStore`, `localize` and `className` (from `@/lib/classes`)
- Produces:
  - the six routes under `/guides`
  - each Content Guide entry rendered as `<details id="<entry-id>">`, which opens when `location.hash` equals its id
  - roadmap phases rendered as `<section id="<phase-id>">`

- [ ] **Step 1: Add the `guides` messages**

Add a top-level key to `messages/en.json`:

```json
  "guides": {
    "title": "Guides",
    "intro": "Community guides for Aion 2, from the spreadsheets by Castform and others.",
    "back": "All guides",
    "pages": { "content": "Content guide", "roadmap": "Roadmap", "tips": "Tips and settings", "buffs": "Chanter vs Cleric", "links": "Class guides and creators" },
    "descriptions": {
      "content": "Every daily, weekly and recharge activity: rewards, requirements and strategy.",
      "roadmap": "What to do from level 45 to 2,000 gear score, with your progress.",
      "tips": "The most useful tips and in-game settings.",
      "buffs": "How the buffs of the two support classes compare.",
      "links": "In-depth guides and content creators for each class."
    },
    "content": {
      "search": "Search activities",
      "filters": { "section": "Section", "mode": "Mode", "scope": "Character" },
      "sections": { "all": "All", "daily": "Daily", "weekly": "Weekly", "recharge": "Recharge", "misc": "Misc" },
      "modes": { "all": "All", "pve": "PvE", "pvp": "PvP" },
      "scopes": { "all": "All", "main": "Main", "alt": "Alt" },
      "mainOnly": "Main only",
      "count": "Count",
      "rewards": "Rewards",
      "requirements": "Requirements",
      "where": "Where",
      "strategy": "Strategy",
      "notes": "Notes",
      "results": "{count, plural, one {# activity} other {# activities}}",
      "empty": "No activities match these filters."
    },
    "roadmap": { "progress": "{done} of {total} steps done", "systems": "Systems to work on", "targets": "Enhancement targets", "note": "Note", "warning": "Important", "open": "Open link" },
    "tips": { "settings": "Recommended settings", "more": "More settings" },
    "buffs": { "chanter": "Chanter", "cleric": "Cleric", "differences": "Main differences", "pairs": "Buffs side by side", "comp": "Party composition" },
    "links": { "guides": "Guides", "creators": "Content creators", "tools": "Tools", "none": "No creators listed yet." }
  }
```

Add the matching key to `messages/it.json`:

```json
  "guides": {
    "title": "Guide",
    "intro": "Guide della community per Aion 2, dai fogli di Castform e altri.",
    "back": "Tutte le guide",
    "pages": { "content": "Guida ai contenuti", "roadmap": "Roadmap", "tips": "Consigli e impostazioni", "buffs": "Chanter vs Cleric", "links": "Guide di classe e creator" },
    "descriptions": {
      "content": "Tutte le attività giornaliere, settimanali e a ricarica: ricompense, requisiti e strategia.",
      "roadmap": "Cosa fare dal livello 45 a 2.000 di gear score, con i tuoi progressi.",
      "tips": "I consigli più utili e le impostazioni di gioco.",
      "buffs": "Il confronto tra i buff delle due classi di supporto.",
      "links": "Guide approfondite e content creator per ogni classe."
    },
    "content": {
      "search": "Cerca attività",
      "filters": { "section": "Sezione", "mode": "Modalità", "scope": "Personaggio" },
      "sections": { "all": "Tutte", "daily": "Giornaliere", "weekly": "Settimanali", "recharge": "Ricariche", "misc": "Varie" },
      "modes": { "all": "Tutte", "pve": "PvE", "pvp": "PvP" },
      "scopes": { "all": "Tutti", "main": "Main", "alt": "Alt" },
      "mainOnly": "Solo main",
      "count": "Quantità",
      "rewards": "Ricompense",
      "requirements": "Requisiti",
      "where": "Dove",
      "strategy": "Strategia",
      "notes": "Note",
      "results": "{count, plural, one {# attività} other {# attività}}",
      "empty": "Nessuna attività corrisponde a questi filtri."
    },
    "roadmap": { "progress": "{done} di {total} passi completati", "systems": "Sistemi su cui lavorare", "targets": "Obiettivi di potenziamento", "note": "Nota", "warning": "Importante", "open": "Apri link" },
    "tips": { "settings": "Impostazioni consigliate", "more": "Altre impostazioni" },
    "buffs": { "chanter": "Chanter", "cleric": "Cleric", "differences": "Differenze principali", "pairs": "Buff a confronto", "comp": "Composizione del party" },
    "links": { "guides": "Guide", "creators": "Content creator", "tools": "Strumenti", "none": "Ancora nessun creator in elenco." }
  }
```

Run: `pnpm test tests/i18n-keys.test.ts`
Expected: PASS.

- [ ] **Step 2: Create the Content Guide view**

```tsx
// src/components/guides/guide-content-view.tsx
"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { CONTENT_GUIDE, GUIDE_SECTIONS, filterGuide, type GuideEntry, type GuideFilter } from "@/lib/guides";
import { localize } from "@/lib/activities";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ALL: GuideFilter = { section: "all", mode: "all", scope: "all", q: "" };
const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const readHash = () => decodeURIComponent(window.location.hash.slice(1));

function Chips<T extends string>(props: { label: string; options: readonly T[]; value: T; onChange(v: T): void; text(v: T): string }) {
  return (
    <div role="group" aria-label={props.label} className="flex flex-wrap gap-1.5">
      {props.options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={props.value === o}
          onClick={() => props.onChange(o)}
          className={cn(
            "min-h-11 rounded-full border px-4 text-sm transition-colors",
            props.value === o ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground",
          )}
        >
          {props.text(o)}
        </button>
      ))}
    </div>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn(wide && "sm:col-span-2")}>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line">{children}</dd>
    </div>
  );
}

function Entry({ e, open, onToggle }: { e: GuideEntry; open: boolean; onToggle(open: boolean): void }) {
  const t = useTranslations("guides.content");
  const locale = useLocale();
  const L = (x: { en: string; it: string }) => localize(x, locale);
  return (
    <details id={e.id} open={open} onToggle={(ev) => onToggle(ev.currentTarget.open)} className="group scroll-mt-24 rounded-xl border border-border bg-card open:border-primary/50">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
        {e.icon ? (
          // eslint-disable-next-line @next/next/no-img-element -- small sheet icons of unknown size
          <img src={e.icon} alt="" width={32} height={32} className="size-8 shrink-0 rounded" />
        ) : (
          <span className="size-8 shrink-0 rounded bg-muted" aria-hidden />
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{e.name}</span>
          <span className="block text-xs text-muted-foreground">{L(e.type)} · {L(e.count)}</span>
        </span>
        <span className="hidden gap-1 sm:flex">
          {e.modes.map((m) => <Badge key={m} variant="secondary">{t(`modes.${m}`)}</Badge>)}
          {e.scope === "main" && <Badge variant="outline">{t("mainOnly")}</Badge>}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <dl className="grid gap-3 border-t border-border px-4 py-3 text-sm sm:grid-cols-2">
        <Field label={t("requirements")}>{L(e.requirements)}</Field>
        <Field label={t("where")}>{e.where}</Field>
        <Field label={t("rewards")} wide>{e.rewards}</Field>
        <Field label={t("strategy")} wide>{L(e.strategy)}</Field>
        {e.notes && <Field label={t("notes")} wide>{L(e.notes)}</Field>}
      </dl>
    </details>
  );
}

export function GuideContentView() {
  const t = useTranslations("guides.content");
  const locale = useLocale();
  const [filter, setFilter] = useState<GuideFilter>(ALL);
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const hash = useSyncExternalStore(subscribeHash, readHash, () => "");
  const entries = useMemo(() => filterGuide(CONTENT_GUIDE, filter, locale), [filter, locale]);
  const set = (patch: Partial<GuideFilter>) => setFilter((f) => ({ ...f, ...patch }));

  useEffect(() => {
    if (hash) document.getElementById(hash)?.scrollIntoView({ block: "start" });
  }, [hash]);

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <Input type="search" aria-label={t("search")} placeholder={t("search")} value={filter.q} onChange={(e) => set({ q: e.target.value })} className="min-h-11" />
        <Chips label={t("filters.section")} options={["all", ...GUIDE_SECTIONS] as const} value={filter.section} onChange={(section) => set({ section })} text={(v) => t(`sections.${v}`)} />
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Chips label={t("filters.mode")} options={["all", "pve", "pvp"] as const} value={filter.mode} onChange={(mode) => set({ mode })} text={(v) => t(`modes.${v}`)} />
          <Chips label={t("filters.scope")} options={["all", "main", "alt"] as const} value={filter.scope} onChange={(scope) => set({ scope })} text={(v) => t(`scopes.${v}`)} />
        </div>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">{t("results", { count: entries.length })}</p>
      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <Entry key={e.id} e={e} open={toggled[e.id] ?? e.id === hash} onToggle={(open) => setToggled((s) => (s[e.id] === open ? s : { ...s, [e.id]: open }))} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create the Roadmap view**

```tsx
// src/components/guides/roadmap-view.tsx
"use client";
import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useUserStore } from "@/store/user-store";
import { ROADMAP, roadmapProgress, toggleRoadmapItem } from "@/lib/guides";
import { localize } from "@/lib/activities";
import { cn } from "@/lib/utils";

export function RoadmapView() {
  const t = useTranslations("guides.roadmap");
  const locale = useLocale();
  const L = (x: { en: string; it: string }) => localize(x, locale);
  const done = useUserStore((s) => s.data.roadmap.done);
  const hydrated = useUserStore((s) => s.hydrated);
  const update = useUserStore((s) => s.update);
  const doneSet = new Set(done);
  const p = roadmapProgress(done);

  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground" aria-live="polite">{hydrated ? t("progress", p) : "\u00a0"}</p>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} />
          </div>
        </div>
        {ROADMAP.phases.map((phase) => (
          <section key={phase.id} id={phase.id} aria-labelledby={`${phase.id}-title`} className="scroll-mt-24 rounded-xl border border-border bg-card p-4">
            <h2 id={`${phase.id}-title`} className="font-display text-lg font-semibold">{L(phase.title)}</h2>
            {phase.intro && <p className="mt-1 text-sm text-muted-foreground">{L(phase.intro)}</p>}
            <ul className="mt-3 space-y-1">
              {phase.items.map((item) =>
                item.kind === "step" ? (
                  <li key={item.id}>
                    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-accent/40">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]"
                        checked={doneSet.has(item.id)}
                        disabled={!hydrated}
                        onChange={() => update((d) => toggleRoadmapItem(d, item.id))}
                      />
                      <span className={cn("whitespace-pre-line text-sm", doneSet.has(item.id) && "text-muted-foreground line-through")}>
                        {L(item.text)}
                        {item.url && (
                          <>
                            {" "}
                            <a href={item.url} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">{t("open")}</a>
                          </>
                        )}
                      </span>
                    </label>
                  </li>
                ) : (
                  <li key={item.id} className={cn("whitespace-pre-line rounded-md border px-3 py-2 text-sm", item.kind === "warning" ? "border-destructive/60 bg-destructive/10" : "border-border bg-muted/40")}>
                    <span className="font-medium">{t(item.kind)}: </span>
                    {L(item.text)}
                  </li>
                ),
              )}
            </ul>
          </section>
        ))}
      </div>
      <aside className="space-y-4 lg:sticky lg:top-20">
        {([["systems", ROADMAP.systems], ["targets", ROADMAP.targets]] as const).map(([key, items]) => (
          <section key={key} className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-2 font-display text-base font-semibold">{t(key)}</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm">{items.map((x) => <li key={x.en}>{L(x)}</li>)}</ul>
          </section>
        ))}
      </aside>
    </div>
  );
}
```

- [ ] **Step 4: Create the pages**

Every guide page shares this header pattern: a back link to `/guides`, an `h1`, and an optional intro. Each page also exports a `generateMetadata` with `title: t("pages.<page>")`.

```tsx
// src/app/[locale]/guides/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GUIDE_PAGES } from "@/lib/guides";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guides" });
  return { title: t("title") };
}

export default async function GuidesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guides");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {GUIDE_PAGES.map((p) => (
          <li key={p}>
            <Link href={`/guides/${p}`} className="block h-full rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/60">
              <h2 className="font-display text-lg font-semibold">{t(`pages.${p}`)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t(`descriptions.${p}`)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/components/guides/guide-header.tsx
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function GuideHeader({ page }: { page: "content" | "roadmap" | "tips" | "buffs" | "links" }) {
  const t = await getTranslations("guides");
  return (
    <header className="space-y-2">
      <Link href="/guides" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <h1 className="font-display text-3xl font-bold">{t(`pages.${page}`)}</h1>
      <p className="max-w-prose text-muted-foreground">{t(`descriptions.${page}`)}</p>
    </header>
  );
}
```

```tsx
// src/app/[locale]/guides/content/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GuideHeader } from "@/components/guides/guide-header";
import { GuideContentView } from "@/components/guides/guide-content-view";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guides" });
  return { title: t("pages.content") };
}

export default async function ContentGuidePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <GuideHeader page="content" />
      <GuideContentView />
    </div>
  );
}
```

```tsx
// src/app/[locale]/guides/roadmap/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GuideHeader } from "@/components/guides/guide-header";
import { RoadmapView } from "@/components/guides/roadmap-view";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guides" });
  return { title: t("pages.roadmap") };
}

export default async function RoadmapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <GuideHeader page="roadmap" />
      <RoadmapView />
    </div>
  );
}
```

```tsx
// src/app/[locale]/guides/tips/page.tsx
import { ExternalLink } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GuideHeader } from "@/components/guides/guide-header";
import { TIPS } from "@/lib/guides";
import { localize } from "@/lib/activities";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guides" });
  return { title: t("pages.tips") };
}

export default async function TipsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guides.tips");
  const L = (x: { en: string; it: string }) => localize(x, locale);
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <GuideHeader page="tips" />
      <ol className="space-y-4">
        {TIPS.tips.map((tip, i) => (
          <li key={tip.id} className="flex gap-4 rounded-xl border border-border bg-card p-4">
            <span className="font-display text-2xl font-bold text-primary" aria-hidden>{i + 1}</span>
            <p className="whitespace-pre-line">{L(tip.text)}</p>
          </li>
        ))}
      </ol>
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">{t("settings")}</h2>
        <p className="text-muted-foreground">{L(TIPS.settings.intro)}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {TIPS.settings.images.map((img) => (
            <a key={img.src} href={img.src} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- screenshots of unknown size */}
              <img src={img.src} alt={L(img.alt)} loading="lazy" className="w-full rounded-lg border border-border" />
            </a>
          ))}
        </div>
      </section>
      {TIPS.links.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-xl font-semibold">{t("more")}</h2>
          <ul className="space-y-1">
            {TIPS.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-primary underline underline-offset-2">
                  {L(l.label)}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
```

```tsx
// src/app/[locale]/guides/buffs/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GuideHeader } from "@/components/guides/guide-header";
import { BUFFS } from "@/lib/guides";
import { localize } from "@/lib/activities";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guides" });
  return { title: t("pages.buffs") };
}

type Buff = NonNullable<(typeof BUFFS.pairs)[number]["chanter"]>;

export default async function BuffsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guides.buffs");
  const L = (x: { en: string; it: string }) => localize(x, locale);
  const card = "rounded-xl border border-border bg-card p-4";
  const BuffCard = ({ buff }: { buff: Buff | null }) =>
    buff ? (
      <div className={card}>
        <h3 className="font-semibold">{buff.name}</h3>
        {buff.detail && <p className="text-xs text-muted-foreground">{L(buff.detail)}</p>}
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">{buff.effects.map((e) => <li key={e.en}>{L(e)}</li>)}</ul>
      </div>
    ) : (
      <div aria-hidden />
    );
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <GuideHeader page="buffs" />
      <p className="rounded-xl border border-primary/50 bg-primary/10 p-4 text-sm">{L(BUFFS.intro)}</p>
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">{t("differences")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["chanter", "cleric"] as const).map((c) => (
            <div key={c} className={card}>
              <h3 className="font-display text-lg font-semibold">{t(c)}</h3>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">{BUFFS.differences[c].map((d) => <li key={d.en}>{L(d)}</li>)}</ul>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{t("comp")}: </span>{L(BUFFS.comp)}</p>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">{t("pairs")}</h2>
        <div className="hidden grid-cols-2 gap-4 text-sm text-muted-foreground sm:grid">
          <span>{t("chanter")}</span>
          <span>{t("cleric")}</span>
        </div>
        {BUFFS.pairs.map((pair, i) => (
          <div key={i} className="grid gap-4 sm:grid-cols-2">
            <BuffCard buff={pair.chanter} />
            <BuffCard buff={pair.cleric} />
          </div>
        ))}
      </section>
    </div>
  );
}
```

```tsx
// src/app/[locale]/guides/links/page.tsx
import { ExternalLink } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GuideHeader } from "@/components/guides/guide-header";
import { LINKS } from "@/lib/guides";
import { localize } from "@/lib/activities";
import { className } from "@/lib/classes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guides" });
  return { title: t("pages.links") };
}

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-primary underline underline-offset-2">
      {children}
      <ExternalLink className="size-3.5" aria-hidden />
    </a>
  );
}

export default async function LinksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guides.links");
  const L = (x: { en: string; it: string }) => localize(x, locale);
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <GuideHeader page="links" />
      <div className="grid items-start gap-4 sm:grid-cols-2">
        {LINKS.classes.map((c) => (
          <section key={c.classId} className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-display text-lg font-semibold">{className(c.classId)}</h2>
            <h3 className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">{t("guides")}</h3>
            <ul>{c.guides.map((g) => <li key={g.url}><Ext href={g.url}>{L(g.label)}</Ext></li>)}</ul>
            <h3 className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">{t("creators")}</h3>
            {c.creators.length ? (
              <ul className="flex flex-wrap gap-x-4">{c.creators.map((p) => <li key={p.url}><Ext href={p.url}>{p.name}</Ext></li>)}</ul>
            ) : (
              <p className="py-2 text-sm text-muted-foreground">{t("none")}</p>
            )}
          </section>
        ))}
      </div>
      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold">{t("tools")}</h2>
        <ul>{LINKS.tools.map((tool) => <li key={tool.url}><Ext href={tool.url}>{L(tool.label)}</Ext></li>)}</ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: every command exits 0, and the build lists all six `/guides` routes for both locales.

Then check in `pnpm dev`:
- The index shows 5 cards.
- In the Content Guide, the Recharge chip shows 6 entries, search "nightmare" shows 1, and `/en/guides/content#nightmare` opens and scrolls to Nightmare.
- `/it/guides/content` shows Italian strategy text.
- Ticking a Roadmap step updates the progress bar, and the tick survives a reload.
- Tips shows 3 tips and the screenshots.
- Buffs shows 3 pairs side by side, stacked on mobile.
- Links shows 7 classes and 2 tools.
- Guides is active in the sidebar on every sub-page.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add guides section (content guide, roadmap, tips, buffs, links)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Checklist tooltips with rewards and location

**Files:**
- Create: `src/components/checklist/activity-hints.ts`
- Modify: `src/components/checklist/character-card.tsx`, `messages/en.json`, `messages/it.json`
- Test: `src/components/checklist/activity-hints.test.ts`

**Interfaces:**
- Consumes: `guideFor`, `localize` and `Activity`
- Produces: `activityHints(a: Activity, locale: string, t: HintT): string[]`, where `type HintT = (key: "cap" | "capSub" | "rewards" | "where", values: Record<string, string | number>) => string`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/checklist/activity-hints.test.ts
import { describe, it, expect } from "vitest";
import { activityHints } from "./activity-hints";
import { ACTIVITIES } from "@/lib/activities";
import { GUIDE_BY_ID } from "@/lib/guides";

const t = (key: string, v: Record<string, string | number>) => `${key}:${Object.values(v).join("/")}`;
const a = (id: string) => ACTIVITIES.find((x) => x.id === id)!;

describe("activityHints", () => {
  it("adds rewards and location when the activity has a guide entry", () => {
    const hints = activityHints(a("duty-missions"), "en", t);
    expect(hints).toContain(`rewards:${GUIDE_BY_ID.get("duty-missions")!.rewards}`);
    expect(hints).toContain(`where:${GUIDE_BY_ID.get("duty-missions")!.where}`);
  });
  it("follows explicit guide links and keeps the stockpile cap first", () => {
    const hints = activityHints(a("shugo-festival-key"), "en", t);
    expect(hints[0]).toBe("capSub:12/21");
    expect(hints).toContain(`where:${GUIDE_BY_ID.get("shugo-festival-reward-key")!.where}`);
  });
  it("works without a guide entry", () => {
    expect(activityHints(a("conquest"), "it", t)).toEqual(["Usa Odyle Energy."]);
    expect(activityHints(a("sanctuary"), "en", t)).toEqual([]);
  });
});
```

Run: `pnpm test src/components/checklist/activity-hints.test.ts`
Expected: FAIL, because the module cannot be found.

- [ ] **Step 2: Implement and wire it in**

```ts
// src/components/checklist/activity-hints.ts
import { localize, type Activity } from "@/lib/activities";
import { guideFor } from "@/lib/guides";

export type HintT = (key: "cap" | "capSub" | "rewards" | "where", values: Record<string, string | number>) => string;

export function activityHints(a: Activity, locale: string, t: HintT): string[] {
  const g = guideFor(a);
  const lines: (string | false | undefined)[] = [
    "cap" in a.limit && (a.limit.capSub ? t("capSub", { cap: a.limit.cap, capSub: a.limit.capSub }) : t("cap", { cap: a.limit.cap })),
    a.note && localize(a.note, locale),
    g && t("rewards", { value: g.rewards }),
    g && t("where", { value: g.where }),
  ];
  return lines.filter((x): x is string => Boolean(x));
}
```

In `src/components/checklist/character-card.tsx`, add `import { activityHints } from "./activity-hints";`. Then replace the `const lines = [ ... ].filter(Boolean) as string[];` block in `ActivityName` with:

```tsx
  const lines = activityHints(a, locale, (key, values) => t(key, values));
```

Add these to `"checklist"` in `messages/en.json`: `"rewards": "Rewards: {value}", "where": "Where: {value}"`. Add these to `"checklist"` in `messages/it.json`: `"rewards": "Ricompense: {value}", "where": "Dove: {value}"`.

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: every test passes and the typecheck and lint runs are clean.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: show rewards and location in checklist tooltips

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Ctrl+K command palette

**Files:**
- Create: `src/lib/search.ts`, `src/components/command-palette.tsx`
- Test: `src/lib/search.test.ts`
- Modify: `src/components/shell/top-bar.tsx`, `messages/en.json`, `messages/it.json`
- Add shadcn: `command`

**Interfaces:**
- Consumes: `CONTENT_GUIDE`, `ROADMAP`, `GUIDE_PAGES` and `localize`
- Produces:
  - `type SearchItem = { id: string; group: "pages" | "activities" | "roadmap"; label: string; href: string; keywords: string }`
  - `buildSearchIndex(locale: string, labels: { nav(key: string): string; guide(key: string): string }): SearchItem[]`
  - `<CommandPalette />`, which also renders the top-bar search button

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/search.test.ts
import { describe, it, expect } from "vitest";
import { buildSearchIndex } from "./search";

const labels = { nav: (k: string) => `nav.${k}`, guide: (k: string) => `guide.${k}` };

describe("buildSearchIndex", () => {
  const items = buildSearchIndex("it", labels);
  it("has unique ids", () => {
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });
  it("includes every page with localized labels", () => {
    const pages = items.filter((i) => i.group === "pages");
    expect(pages.map((p) => p.href)).toEqual(["/", "/checklist", "/crafting", "/guides", "/guides/content", "/guides/roadmap", "/guides/tips", "/guides/buffs", "/guides/links", "/settings"]);
    expect(pages.find((p) => p.href === "/guides/roadmap")!.label).toBe("guide.roadmap");
  });
  it("deep-links activities and roadmap phases", () => {
    expect(items.find((i) => i.id === "activity:nightmare")).toMatchObject({ href: "/guides/content#nightmare", label: "Nightmare" });
    expect(items.some((i) => i.group === "roadmap" && i.href.startsWith("/guides/roadmap#"))).toBe(true);
  });
});
```

Run: `pnpm test src/lib/search.test.ts`
Expected: FAIL, because the module cannot be found.

- [ ] **Step 2: Implement the search index**

```ts
// src/lib/search.ts
import { CONTENT_GUIDE, GUIDE_PAGES, ROADMAP } from "./guides";
import { localize } from "./activities";

export type SearchItem = { id: string; group: "pages" | "activities" | "roadmap"; label: string; href: string; keywords: string };

export function buildSearchIndex(locale: string, labels: { nav(key: string): string; guide(key: string): string }): SearchItem[] {
  const page = (id: string, href: string, label: string): SearchItem => ({ id: `page:${id}`, group: "pages", label, href, keywords: "" });
  const pages = [
    page("home", "/", labels.nav("home")),
    page("checklist", "/checklist", labels.nav("checklist")),
    page("crafting", "/crafting", labels.nav("crafting")),
    page("guides", "/guides", labels.nav("guides")),
    ...GUIDE_PAGES.map((p) => page(`guides-${p}`, `/guides/${p}`, labels.guide(p))),
    page("settings", "/settings", labels.nav("settings")),
  ];
  const activities = CONTENT_GUIDE.map((e): SearchItem => ({
    id: `activity:${e.id}`,
    group: "activities",
    label: e.name,
    href: `/guides/content#${e.id}`,
    keywords: `${localize(e.type, locale)} ${e.where}`,
  }));
  const roadmap = ROADMAP.phases.map((p): SearchItem => ({
    id: `roadmap:${p.id}`,
    group: "roadmap",
    label: localize(p.title, locale),
    href: `/guides/roadmap#${p.id}`,
    keywords: "",
  }));
  return [...pages, ...activities, ...roadmap];
}
```

Run: `pnpm test src/lib/search.test.ts`
Expected: PASS.

- [ ] **Step 3: Add the messages and the command component**

Add a top-level key to `messages/en.json`:

```json
  "palette": {
    "open": "Search (Ctrl+K)",
    "title": "Search",
    "description": "Jump to a page, an activity or a roadmap step.",
    "placeholder": "Search pages and activities…",
    "empty": "No results.",
    "groups": { "pages": "Pages", "activities": "Activities", "roadmap": "Roadmap" }
  }
```

Add the matching key to `messages/it.json`:

```json
  "palette": {
    "open": "Cerca (Ctrl+K)",
    "title": "Cerca",
    "description": "Vai a una pagina, un'attività o un passo della roadmap.",
    "placeholder": "Cerca pagine e attività…",
    "empty": "Nessun risultato.",
    "groups": { "pages": "Pagine", "activities": "Attività", "roadmap": "Roadmap" }
  }
```

Run: `pnpm dlx shadcn@latest add -y command`

Read the generated `src/components/ui/command.tsx` and note how `CommandDialog` passes `title`, `description`, `open` and `onOpenChange`. The component below assumes the usual shadcn API. If the generated one differs, adapt the props and keep the behaviour.

- [ ] **Step 4: Create the palette and mount it**

```tsx
// src/components/command-palette.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { buildSearchIndex, type SearchItem } from "@/lib/search";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const GROUPS: SearchItem["group"][] = ["pages", "activities", "roadmap"];

export function CommandPalette() {
  const t = useTranslations("palette");
  const tNav = useTranslations("nav");
  const tGuide = useTranslations("guides.pages");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = useMemo(() => buildSearchIndex(locale, { nav: (k) => tNav(k), guide: (k) => tGuide(k) }), [locale, tNav, tGuide]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    const [path, hash] = href.split("#");
    // Same page: change only the hash so the page opens the entry without a navigation.
    if (hash && path === pathname) window.location.hash = hash;
    else router.push(href);
  };

  return (
    <>
      <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label={t("open")} onClick={() => setOpen(true)}>
        <Search className="size-4" aria-hidden />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title={t("title")} description={t("description")}>
        <CommandInput placeholder={t("placeholder")} />
        <CommandList>
          <CommandEmpty>{t("empty")}</CommandEmpty>
          {GROUPS.map((g) => (
            <CommandGroup key={g} heading={t(`groups.${g}`)}>
              {items.filter((i) => i.group === g).map((i) => (
                <CommandItem key={i.id} value={`${i.label} ${i.keywords} ${i.id}`} onSelect={() => go(i.href)}>
                  {i.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
```

In `src/components/shell/top-bar.tsx`:
- import it with `import { CommandPalette } from "@/components/command-palette";`;
- render `<CommandPalette />` as the first child of `<div className="ml-auto flex items-center gap-3">`, before `<SyncStatus />`.

- [ ] **Step 5: Verify**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: every command exits 0.

Then check in `pnpm dev`:
- Ctrl+K (Cmd+K on Mac) opens the palette, as does the search button.
- Typing "night" lists Nightmare, and Enter goes to `/en/guides/content#nightmare` with the entry open.
- From that page, Ctrl+K → "Duty" → Enter opens Duty Missions without a reload.
- Escape closes the palette.
- The labels are in Italian on `/it`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Ctrl+K command palette

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: End-to-end tests and README

**Files:**
- Create: `e2e/guides.spec.ts`
- Modify: `README.md`

- [ ] **Step 1: Write the spec**

```ts
// e2e/guides.spec.ts
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("dialog", { name: "Welcome to AionTools" }).getByRole("button", { name: "Skip" }).click();
});

test("crafting prices update the total and persist", async ({ page }) => {
  await page.goto("/en/crafting");
  const total = page.getByTestId("crafting-total");
  await expect(total).toHaveText("30,477,639");
  const price = page.getByLabel("Unit price of Common Material");
  await price.fill("2000");
  await price.press("Enter");
  await expect(total).toHaveText("30,492,838");
  await page.reload();
  await expect(page.getByLabel("Unit price of Common Material")).toHaveValue("2000");
  await expect(page.getByTestId("crafting-total")).toHaveText("30,492,838");
});

test("content guide filters by section", async ({ page }) => {
  await page.goto("/en/guides/content");
  await page.getByRole("group", { name: "Section" }).getByRole("button", { name: "Recharge" }).click();
  await expect(page.getByText("Nightmare", { exact: true })).toBeVisible();
  await expect(page.getByText("Duty Missions", { exact: true })).toHaveCount(0);
});

test("roadmap steps persist", async ({ page }) => {
  await page.goto("/en/guides/roadmap");
  const first = page.getByRole("checkbox").first();
  await first.check();
  await expect(page.getByText(/^1 of \d+ steps done$/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
});

test("Ctrl+K jumps to an activity", async ({ page }) => {
  await page.goto("/en");
  await page.keyboard.press("Control+k");
  await page.keyboard.type("Nightmare");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/guides\/content#nightmare$/);
  await expect(page.locator("details#nightmare")).toHaveAttribute("open", "");
  // Same-page jump: opens another entry without a navigation.
  await page.keyboard.press("Control+k");
  await page.keyboard.type("Duty Missions");
  await page.keyboard.press("Enter");
  await expect(page.locator("details#duty-missions")).toHaveAttribute("open", "");
});
```

- [ ] **Step 2: Run the end-to-end suite**

Run: `pnpm e2e`
Expected: 7 passed (3 from earlier plans and 4 new).

If a dev server is running on port 3000, stop it first.

- [ ] **Step 3: Update the README**

Replace the README's first paragraph (under `# AionTools`) with:

```markdown
Aion 2 tools: a daily/weekly checklist for a main and 8 alts with automatic resets, a crafting cost calculator, guides (content guide, roadmap with progress, tips, Chanter vs Cleric, class guides) and Ctrl+K search. IT/EN, no login, optional sync between devices.
```

After the `## Content` paragraph, add:

```markdown
Guide and crafting content lives in `content/` as JSON with English and Italian text side by side (`{ "en": …, "it": … }`). Images come from the community spreadsheets via `node scripts/import-guide-images.mts`.
```

- [ ] **Step 4: Run everything and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e`
Expected: every command exits 0.

```bash
git add -A
git commit -m "test: add e2e coverage for crafting, guides and the command palette

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Hand off**

The plan stops here. Pushing and opening the PR follow superpowers:finishing-a-development-branch, and both need the user's choice.
