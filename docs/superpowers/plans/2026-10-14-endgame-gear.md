# Endgame Gear and Clearer Build Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a curated endgame gear table with real usage shares from GameWith to each build page, and split "Gear & more" into named, explained sub-groups.

**Architecture:**
- A pure parser in `src/lib/gear-usage-parser.ts` turns GameWith build-stats HTML into typed usage data and merges NA+EU.
- A manual Node script writes `content/gear/usage/{global,kr,tw}.json` and self-hosts the icons.
- `src/lib/gear.ts` validates those files plus the hand-curated `content/gear/meta.json`.
- The build page stays a server component. Region-dependent parts are small client components that read the region from the user store.

**Tech Stack:** Next.js 16 App Router (cacheComponents), next-intl 4, Zod 4, Zustand, jsdom (already a devDependency; used by the script and by Vitest), Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-14-endgame-gear-design.md` (extends `docs/superpowers/specs/2026-10-13-aiontools-design.md`).

## Global Constraints

- Take nothing new from questlog.gg: no API calls, no icons.
- GameWith regions: `nae` + `eu` → `global`, `kr` → `kr`, `tw` → `tw`. The GameWith class slug for `spirit-master` is `elementalist`.
- The import script runs by hand only. It makes sequential requests 1 s apart with User-Agent `aiontools-gear-import/1.0 (+https://github.com/davidesidoti/aiontools)`, and writes nothing if any page fails to parse.
- Usage files keep the top 3 per slot, top 10 titles and top 5 wings. Shares are 0–100 with one decimal.
- Global NA+EU share = `(shareNA × sampleNA + shareEU × sampleEU) / (sampleNA + sampleEU)`. An item missing in one region counts as 0 there.
- Gear slots: `weapon | guard | helmet | shoulder | torso | gloves | pants | boots | cape | earring | necklace | ring | bracelet | belt | amulet | rune`. Arcana, Pendant, Brooches and Seals are ignored.
- The curated meta is for Global only. On KR/TW the curated columns are hidden and a "later season" note is shown.
- The server renders Global; the client switches to the stored region after hydration.
- Every new UI string goes in EN and IT. Item, title and wing names stay in English.
- Dark theme only. Icons are plain `<img>` with the existing eslint-disable comment pattern. Touch targets are at least 44 px (`min-h-11`).
- **Ruling carried from the spec:** icons are saved as GameWith serves them (already `.webp`), without resizing, so no new image dependency is added. Cost if wrong: slightly larger icons.
- **Ruling on wings:** the sheet stores wings as one free-text line per field (for example "Erroded Wings (54.5%) / Talisra Wings (18.5%)"), not as a list of names. So instead of adding a share next to each name, the Wings group shows a "Most used now" list (top 5 with shares). Cost if wrong: a small UI change.
- Commits use `git -c user.name="Davide Sidoti" -c user.email="sidotidavide@gmail.com" commit …` (no global git identity on this machine) and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A GameWith layout change must stop the import instead of writing empty data.** A page without the sample line, data date or gear slots throws. Task 1 has a unit test.
2. **The same title or item listed twice on a page must not show up twice.** Faction or grade variants share a name, so their shares are added. Task 1 has a unit test.
3. **A user whose stored region is TW must see TW usage and no Global curated columns.** Region read before hydration must not flash TW data into SSR. Task 5 has a component test and an e2e test.
4. **A recommended item outside the top 3 must read "uncommon", not "used by 0%".** Task 5 has a component test.
5. **Sub-group anchors must land below the sticky build header, like section anchors do.** Task 4 has an e2e test.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/gear-usage-parser.ts` (new) | Slots, usage types and Zod schema, GameWith page parser, region merge. No path aliases, because the Node script imports it. |
| `src/lib/gear-usage-parser.test.ts` (new) | Parser and merge tests on saved pages. |
| `tests/fixtures/gamewith/ranger-nae.html`, `ranger-tw.html` (new) | Saved GameWith pages. |
| `scripts/import-gear-usage.mts` (new) | Fetch, parse, merge, localize icons, validate and write. |
| `content/gear/usage/{global,kr,tw}.json`, `public/gear/*.webp` (generated) | Usage data and icons. |
| `content/gear/meta.json` (new) | Curated meta: slots, class weapons, group explanations, sources. |
| `src/lib/gear.ts` (new) | Loads and validates meta and usage; `findMatch`, `gearUsageFor`. |
| `src/lib/gear.test.ts` (new) | Schema coverage and matching tests. |
| `src/components/builds/build-section.tsx` | Adds `BuildGroup`. |
| `src/components/builds/gear-usage.tsx` (new) | Client components: `EndgameGear`, `TitlesWithShare`, `TopUsed`. |
| `src/components/builds/gear-usage.test.tsx` (new) | Component tests. |
| `src/app/[locale]/builds/[classId]/page.tsx` | Sub-groups, nav anchors, wiring. |
| `messages/en.json`, `messages/it.json` | New strings. |
| `e2e/gear.spec.ts` (new) | Anchors, the endgame table and the region switch. |

---

### Task 1: GameWith page parser and region merge

**Files:**
- Create: `src/lib/gear-usage-parser.ts`, `src/lib/gear-usage-parser.test.ts`, `tests/fixtures/gamewith/ranger-nae.html`, `tests/fixtures/gamewith/ranger-tw.html`

**Interfaces:**
- Produces:
  - `GEAR_SLOTS`, `type GearSlot`
  - `type UsageEntry = { name: string; icon?: string; share: number; enhance?: number }`
  - `type ClassUsage = { sample: number; sourceUrls: string[]; slots: Partial<Record<GearSlot, UsageEntry[]>>; titles: UsageEntry[]; wings: UsageEntry[] }`
  - `type GearUsage = { region: "global" | "kr" | "tw"; fetchedAt: string; classes: Record<string, ClassUsage> }`
  - `GearUsageSchema` (Zod)
  - `parseGameWithPage(doc: Document, url: string): { dataDate: string; usage: ClassUsage }` (uncut lists)
  - `mergeUsage(parts: ClassUsage[]): ClassUsage` (weighted merge, then the top-N cut; also used with a single part)

- [ ] **Step 1: Save the fixtures**

The two pages were saved during planning (data dated 2026-10-07):

```bash
mkdir -p tests/fixtures/gamewith
cp "/c/Users/sidot/AppData/Local/Temp/claude/C--Users-sidot-Documents-Github-aiontools/060ce9db-56d1-4318-872d-18a94761e838/scratchpad/gw/ranger-nae.html" tests/fixtures/gamewith/
cp "/c/Users/sidot/AppData/Local/Temp/claude/C--Users-sidot-Documents-Github-aiontools/060ce9db-56d1-4318-872d-18a94761e838/scratchpad/gw/ranger-tw.html" tests/fixtures/gamewith/
```

If the scratchpad copies are gone, fetch fresh ones:

```bash
curl -s -A "aiontools-gear-import/1.0 (+https://github.com/davidesidoti/aiontools)" -o tests/fixtures/gamewith/ranger-nae.html https://gamewith.ai/aion2/en/build-stats/nae/ranger
curl -s -A "aiontools-gear-import/1.0 (+https://github.com/davidesidoti/aiontools)" -o tests/fixtures/gamewith/ranger-tw.html https://gamewith.ai/aion2/en/build-stats/tw/ranger
```

Then update the expected numbers in Step 2 from the file (`grep -o 'classes-hero__meta">[^<]*'` and the Main hand table), and ledger a ruling.

- [ ] **Step 2: Write the failing tests**

```ts
// src/lib/gear-usage-parser.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseGameWithPage, mergeUsage, GearUsageSchema, type ClassUsage } from "./gear-usage-parser";

const load = (file: string) =>
  new DOMParser().parseFromString(readFileSync(`tests/fixtures/gamewith/${file}`, "utf8"), "text/html");
const NA = "https://gamewith.ai/aion2/en/build-stats/nae/ranger";

describe("parseGameWithPage", () => {
  const { dataDate, usage } = parseGameWithPage(load("ranger-nae.html"), NA);

  it("reads the sample size, data date and source", () => {
    expect(usage.sample).toBe(476);
    expect(dataDate).toBe("2026-10-07");
    expect(usage.sourceUrls).toEqual([NA]);
  });
  it("reads every gear slot with name, icon, share and typical enhance", () => {
    expect(Object.keys(usage.slots)).toHaveLength(16);
    expect(usage.slots.weapon![0]).toEqual({
      name: "Spiritforged Bow",
      icon: "https://assets.gamewith.ai/aion2/1791880613501-322/icons/Icon_WP_BW_0078_T05.webp",
      share: 84,
      enhance: 10,
    });
    expect(usage.slots.weapon!.slice(1, 3).map((e) => e.name)).toEqual(["Aulamus Bow", "Rupture Longbow"]);
  });
  it("adds up entries that share a name", () => {
    const hell = usage.titles.filter((e) => e.name === "Through Hell and Back");
    expect(hell).toEqual([expect.objectContaining({ share: 13 })]);
  });
  it("reads wings", () => {
    expect(usage.wings.length).toBeGreaterThan(0);
    expect(usage.wings[0].share).toBeGreaterThan(0);
  });
  it("ignores slots outside our model (Arcana, Pendant, Brooches, Seals)", () => {
    const tw = parseGameWithPage(load("ranger-tw.html"), "tw").usage;
    expect(Object.keys(tw.slots).sort()).toEqual(Object.keys(usage.slots).sort());
    expect(tw.slots.weapon![0].name).toBe("Splendent Genesis Dragon Lord Bow");
  });
  it("throws instead of returning empty data when the layout changed", () => {
    const empty = new DOMParser().parseFromString("<html><body><h1>Ranger</h1></body></html>", "text/html");
    expect(() => parseGameWithPage(empty, "x")).toThrow(/sample/);
  });
});

const part = (sample: number, url: string, weapon: [string, number][]): ClassUsage => ({
  sample,
  sourceUrls: [url],
  slots: { weapon: weapon.map(([name, share]) => ({ name, share })) },
  titles: [],
  wings: [],
});

describe("mergeUsage", () => {
  it("weights shares by sample size and counts a missing item as 0", () => {
    const m = mergeUsage([
      part(100, "na", [["A", 50], ["B", 50]]),
      part(300, "eu", [["A", 10], ["C", 90]]),
    ]);
    expect(m.sample).toBe(400);
    expect(m.sourceUrls).toEqual(["na", "eu"]);
    expect(m.slots.weapon).toEqual([
      { name: "C", share: 67.5 },
      { name: "A", share: 20 },
      { name: "B", share: 12.5 },
    ]);
  });
  it("keeps only the top 3 per slot", () => {
    const m = mergeUsage([part(10, "x", [["A", 40], ["B", 30], ["C", 20], ["D", 10]])]);
    expect(m.slots.weapon!.map((e) => e.name)).toEqual(["A", "B", "C"]);
  });
  it("produces data the schema accepts", () => {
    const m = mergeUsage([part(10, "https://gamewith.ai/x", [["A", 40]])]);
    expect(GearUsageSchema.safeParse({ region: "global", fetchedAt: "2026-10-07", classes: { ranger: m } }).success).toBe(true);
  });
});
```

Run: `pnpm test src/lib/gear-usage-parser.test.ts`
Expected: FAIL, because `./gear-usage-parser` does not exist.

- [ ] **Step 3: Implement**

```ts
// src/lib/gear-usage-parser.ts
// Parses GameWith build-stats pages (gamewith.ai/aion2/en/build-stats/<region>/<class>) and merges regions.
// No path aliases: scripts/import-gear-usage.mts imports this file directly with Node.
import { z } from "zod";

export const GEAR_SLOTS = [
  "weapon", "guard", "helmet", "shoulder", "torso", "gloves", "pants", "boots", "cape",
  "earring", "necklace", "ring", "bracelet", "belt", "amulet", "rune",
] as const;
export type GearSlot = (typeof GEAR_SLOTS)[number];

const Entry = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  share: z.number().min(0).max(100),
  enhance: z.number().int().min(0).optional(),
});
export const ClassUsageSchema = z.object({
  sample: z.number().int().positive(),
  sourceUrls: z.array(z.url()).min(1),
  slots: z.partialRecord(z.enum(GEAR_SLOTS), z.array(Entry)),
  titles: z.array(Entry),
  wings: z.array(Entry),
});
export const GearUsageSchema = z.object({
  region: z.enum(["global", "kr", "tw"]),
  fetchedAt: z.iso.date(),
  classes: z.record(z.string(), ClassUsageSchema),
});
export type UsageEntry = z.infer<typeof Entry>;
export type ClassUsage = z.infer<typeof ClassUsageSchema>;
export type GearUsage = z.infer<typeof GearUsageSchema>;

const SLOT_HEADINGS: Record<string, GearSlot> = {
  "Main hand": "weapon", "Off hand": "guard", Helm: "helmet", Pauldrons: "shoulder", Chest: "torso",
  Gloves: "gloves", Greaves: "pants", Boots: "boots", Cloak: "cape", Earrings: "earring",
  Necklace: "necklace", Rings: "ring", Bracelets: "bracelet", Belt: "belt", Amulet: "amulet", Runes: "rune",
};
const TOP = { slot: 3, titles: 10, wings: 5 };
const round1 = (n: number) => Math.round(n * 10) / 10;

function share(text: string, url: string): number {
  const m = text.match(/(\d+(?:\.\d+)?)%/);
  if (!m) throw new Error(`${url}: share not found in "${text.trim()}"`);
  return Number(m[1]);
}

// The same name can be listed twice (faction or grade variants): add their shares.
function combine(entries: UsageEntry[]): UsageEntry[] {
  const byName = new Map<string, UsageEntry>();
  for (const e of entries) {
    const prev = byName.get(e.name);
    byName.set(e.name, prev ? { ...prev, share: round1(prev.share + e.share) } : e);
  }
  return [...byName.values()].sort((a, b) => b.share - a.share);
}

const clean = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

function table(doc: Document, header: string): HTMLTableElement | undefined {
  return [...doc.querySelectorAll("table")].find((t) => t.querySelector("thead th")?.textContent?.trim() === header);
}

function simpleRows(t: HTMLTableElement | undefined, url: string): UsageEntry[] {
  if (!t) return [];
  return combine([...t.querySelectorAll("tbody tr")].map((tr) => {
    const td = tr.querySelectorAll("td");
    return clean({
      name: td[0].textContent?.trim() ?? "",
      icon: td[0].querySelector("img")?.getAttribute("src") ?? undefined,
      share: share(td[1].textContent ?? "", url),
    });
  }));
}

export function parseGameWithPage(doc: Document, url: string): { dataDate: string; usage: ClassUsage } {
  const sample = Number(doc.querySelector(".classes-hero__meta")?.textContent?.match(/^([\d,]+) characters/)?.[1]?.replace(/,/g, ""));
  if (!sample) throw new Error(`${url}: sample size not found`);
  const ld = [...doc.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent ?? "").join("");
  const dataDate = ld.match(/"dateModified":"(\d{4}-\d{2}-\d{2})"/)?.[1];
  if (!dataDate) throw new Error(`${url}: data date not found`);

  const slots: ClassUsage["slots"] = {};
  for (const block of doc.querySelectorAll("#equipment .bs-slot")) {
    const slot = SLOT_HEADINGS[block.querySelector("h3")?.textContent?.trim() ?? ""];
    if (!slot) continue; // Arcana, and slots our model doesn't have (Pendant, Brooches, Seals)
    slots[slot] = combine([...block.querySelectorAll("tbody tr")].map((tr) => {
      const td = tr.querySelectorAll("td");
      const enhance = td[3]?.textContent?.match(/\d+/)?.[0];
      return clean({
        name: td[0].querySelector(".classes-skill > span")?.firstChild?.textContent?.trim() ?? "",
        icon: td[0].querySelector("img")?.getAttribute("src") ?? undefined,
        share: share(td[2]?.textContent ?? "", url),
        enhance: enhance === undefined ? undefined : Number(enhance),
      });
    }));
  }
  if (Object.keys(slots).length === 0) throw new Error(`${url}: no gear slots found`);
  if (Object.values(slots).some((list) => list.some((e) => !e.name))) throw new Error(`${url}: item without a name`);

  return { dataDate, usage: { sample, sourceUrls: [url], slots, titles: simpleRows(table(doc, "Title"), url), wings: simpleRows(table(doc, "Wing"), url) } };
}

function mergeList(lists: UsageEntry[][], samples: number[], total: number, limit: number): UsageEntry[] {
  const acc = new Map<string, { entry: UsageEntry; weighted: number }>();
  lists.forEach((list, i) => {
    for (const e of list) {
      const prev = acc.get(e.name);
      acc.set(e.name, { entry: prev?.entry ?? e, weighted: (prev?.weighted ?? 0) + e.share * samples[i] });
    }
  });
  return [...acc.values()]
    .map(({ entry, weighted }) => ({ ...entry, share: round1(weighted / total) }))
    .sort((a, b) => b.share - a.share)
    .slice(0, limit);
}

export function mergeUsage(parts: ClassUsage[]): ClassUsage {
  const samples = parts.map((p) => p.sample);
  const total = samples.reduce((a, b) => a + b, 0);
  const slots: ClassUsage["slots"] = {};
  for (const slot of GEAR_SLOTS) {
    const lists = parts.map((p) => p.slots[slot] ?? []);
    if (lists.some((l) => l.length > 0)) slots[slot] = mergeList(lists, samples, total, TOP.slot);
  }
  return {
    sample: total,
    sourceUrls: parts.flatMap((p) => p.sourceUrls),
    slots,
    titles: mergeList(parts.map((p) => p.titles), samples, total, TOP.titles),
    wings: mergeList(parts.map((p) => p.wings), samples, total, TOP.wings),
  };
}
```

Run: `pnpm test src/lib/gear-usage-parser.test.ts`
Expected: PASS, all tests.

If a fixture assertion fails on the real HTML (for example, wing names include extra text), fix the selector, not the assertion, and ledger a ruling.

- [ ] **Step 4: Full suite and commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: everything passes.

```bash
git add src/lib/gear-usage-parser.ts src/lib/gear-usage-parser.test.ts tests/fixtures/gamewith
git -c user.name="Davide Sidoti" -c user.email="sidotidavide@gmail.com" commit -m "feat: parse GameWith build stats and merge regions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Import script, usage data and icons

**Files:**
- Create: `scripts/import-gear-usage.mts`
- Generated: `content/gear/usage/global.json`, `content/gear/usage/kr.json`, `content/gear/usage/tw.json`, `public/gear/*.webp`

**Interfaces:**
- Consumes: `parseGameWithPage`, `mergeUsage`, `GearUsageSchema`, `type ClassUsage`, `type GearUsage` from Task 1.
- Produces: the three JSON files. Each `icon` is a local path `/gear/<lowercased file name>.webp`.

- [ ] **Step 1: Write the script**

```ts
// scripts/import-gear-usage.mts
// Usage shares per class and region from GameWith build stats; icons self-hosted under public/gear.
// Run by hand after patches: `node scripts/import-gear-usage.mts`. Writes nothing if any page fails to parse.
import { JSDOM } from "jsdom";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { parseGameWithPage, mergeUsage, GearUsageSchema, type ClassUsage, type GearUsage } from "../src/lib/gear-usage-parser.ts";

const CLASSES: Record<string, string> = {
  chanter: "chanter", ranger: "ranger", cleric: "cleric", "spirit-master": "elementalist",
  gladiator: "gladiator", sorcerer: "sorcerer", templar: "templar", assassin: "assassin",
};
const REGIONS = { global: ["nae", "eu"], kr: ["kr"], tw: ["tw"] } as const;
const UA = { "user-agent": "aiontools-gear-import/1.0 (+https://github.com/davidesidoti/aiontools)" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string): Promise<Response> {
  await sleep(1000); // be polite: sequential, one request per second
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res;
}

const files: GearUsage[] = [];
for (const [region, sources] of Object.entries(REGIONS) as [GearUsage["region"], readonly string[]][]) {
  const classes: Record<string, ClassUsage> = {};
  const dates: string[] = [];
  for (const [classId, slug] of Object.entries(CLASSES)) {
    const parts: ClassUsage[] = [];
    for (const gw of sources) {
      const url = `https://gamewith.ai/aion2/en/build-stats/${gw}/${slug}`;
      const doc = new JSDOM(await (await get(url)).text()).window.document;
      const { dataDate, usage } = parseGameWithPage(doc, url);
      parts.push(usage);
      dates.push(dataDate);
    }
    classes[classId] = mergeUsage(parts);
  }
  files.push(GearUsageSchema.parse({ region, fetchedAt: dates.sort()[0], classes }));
}

// Self-host icons: every remote icon becomes /gear/<file>.webp.
const icons = new Map<string, string>();
for (const file of files)
  for (const c of Object.values(file.classes))
    for (const e of [...Object.values(c.slots).flat(), ...c.titles, ...c.wings]) {
      if (!e?.icon) continue;
      const local = `/gear/${basename(new URL(e.icon).pathname).toLowerCase()}`;
      icons.set(e.icon, local);
      e.icon = local;
    }
mkdirSync("public/gear", { recursive: true });
for (const [remote, local] of icons) {
  if (existsSync(`public${local}`)) continue;
  writeFileSync(`public${local}`, Buffer.from(await (await get(remote)).arrayBuffer()));
}

mkdirSync("content/gear/usage", { recursive: true });
for (const file of files) {
  writeFileSync(`content/gear/usage/${file.region}.json`, JSON.stringify(file, null, 2) + "\n");
  const samples = Object.entries(file.classes).map(([id, c]) => `${id} ${c.sample}`).join(", ");
  console.log(`${file.region}: data ${file.fetchedAt}; ${samples}`);
}
console.log(`icons: ${icons.size}`);
```

- [ ] **Step 2: Run it**

Run: `node scripts/import-gear-usage.mts`
Expected: it takes about 32 requests plus one per new icon, at one second each. It prints one line each for `global`, `kr` and `tw`, with 8 classes and their samples, then `icons: N`, where N > 0.

Run: `ls content/gear/usage && ls public/gear | head -3 && ls public/gear | wc -l`
Expected: `global.json kr.json tw.json`, followed by the webp files.

Run: `node -e "const g=require('./content/gear/usage/global.json');console.log(Object.keys(g.classes).length, g.classes.ranger.slots.weapon[0])"`
Expected: `8`, then an entry whose `icon` starts with `/gear/`.

- [ ] **Step 3: Verify and commit**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

```bash
git add scripts/import-gear-usage.mts content/gear/usage public/gear
git -c user.name="Davide Sidoti" -c user.email="sidotidavide@gmail.com" commit -m "feat: import GameWith gear usage for global, KR and TW

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Curated meta and the gear module

**Files:**
- Create: `content/gear/meta.json`, `src/lib/gear.ts`, `src/lib/gear.test.ts`

**Interfaces:**
- Consumes: Task 1's schema and types; Task 2's JSON files.
- Produces (`src/lib/gear.ts`):
  - `GEAR_GROUPS = ["endgame","wings","enhancing","titles","stones","pantheon"] as const`, `type GearGroupId`
  - `GEAR_META` (validated meta)
  - `type ClassGear = { fetchedAt: string; usage: ClassUsage }`
  - `type RegionGear = Partial<Record<RegionId, ClassGear>>`
  - `gearUsageFor(classId: string): RegionGear`
  - `normGear(name: string): string`
  - `findMatch(entries: UsageEntry[] | undefined, match: string[]): UsageEntry | undefined`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/gear.test.ts
import { describe, it, expect } from "vitest";
import { GEAR_META, GEAR_GROUPS, gearUsageFor, findMatch, normGear } from "./gear";
import { GEAR_SLOTS } from "./gear-usage-parser";
import { CLASSES } from "./classes";

describe("curated gear meta", () => {
  it("covers every slot once and every class weapon", () => {
    expect(GEAR_META.slots.map((s) => s.slot).sort()).toEqual([...GEAR_SLOTS].sort());
    for (const c of CLASSES) expect(GEAR_META.weapons[c.id], c.id).toBeDefined();
  });
  it("explains every sub-group in both languages", () => {
    for (const g of GEAR_GROUPS) expect(GEAR_META.groups[g].it.length).toBeGreaterThan(0);
  });
});

describe("gear usage", () => {
  it("has data for every class in every region", () => {
    for (const c of CLASSES) expect(Object.keys(gearUsageFor(c.id)).sort(), c.id).toEqual(["global", "kr", "tw"]);
  });
});

describe("findMatch", () => {
  const entries = [
    { name: "Spiritforged Bow", share: 80 },
    { name: "Splendent Ebony Dragon Lord Bow", share: 5 },
  ];
  it("matches a name fragment across faction variants, ignoring case and punctuation", () => {
    expect(findMatch(entries, ["dragon lord"])?.share).toBe(5);
    expect(normGear("Ludra's Fatal Bow")).toBe("ludra's fatal bow");
  });
  it("returns nothing when no entry matches (the 'uncommon' case) or there is no data", () => {
    expect(findMatch(entries, ["abyssal bracelet"])).toBeUndefined();
    expect(findMatch(undefined, ["dragon lord"])).toBeUndefined();
  });
});
```

Run: `pnpm test src/lib/gear.test.ts`
Expected: FAIL, because `./gear` does not exist.

- [ ] **Step 2: Write `content/gear/meta.json`**

Sources are from the research of 2026-10-13. Proper nouns stay in English in IT.

```json
{
  "updated": "2026-10-13",
  "sources": [
    { "label": "Aion2 Guidance — gear progression", "url": "https://aion2guidance.com/en/gear", "date": "2026-10-12" },
    { "label": "Ranger guide by Allyria", "url": "https://docs.google.com/document/d/1evrt_6e6WSHRT1vMem2i3O7ZlfANJbqyZoSn66IFrBo/edit?tab=t.mtdd5mt631lc", "date": "2026-10-11" },
    { "label": "GameWith build stats", "url": "https://gamewith.ai/aion2/en/build-stats/nae/ranger", "date": "2026-10-07" }
  ],
  "slots": [
    { "slot": "weapon", "item": { "en": "Splendent Dragon Lord weapon", "it": "Arma Splendent Dragon Lord" }, "how": { "en": "Craft it, then raise it through Transfer Crafting (T1→T4). Ludra raid weapons are equal.", "it": "Craftala, poi portala su con il Transfer Crafting (T1→T4). Le armi del raid di Ludra sono equivalenti." }, "alt": { "en": "Enraged Kromede weapon (Fire Temple, item level 86)", "it": "Arma di Enraged Kromede (Fire Temple, item level 86)" }, "match": ["dragon lord", "ludra"] },
    { "slot": "guard", "item": { "en": "Splendent Dragon Lord Guard", "it": "Splendent Dragon Lord Guard" }, "how": { "en": "Craft it, then raise it through Transfer Crafting (T1→T4). Ludra's Heart from the Ludra raid is equal.", "it": "Craftala, poi portala su con il Transfer Crafting (T1→T4). Ludra's Heart dal raid di Ludra è equivalente." }, "alt": { "en": "Vakron Guard (item level 70)", "it": "Vakron Guard (item level 70)" }, "match": ["dragon lord", "ludra"] },
    { "slot": "helmet", "item": { "en": "Splendent Dragon Lord Helm", "it": "Splendent Dragon Lord Helm" }, "how": { "en": "Craft it, then raise it through Transfer Crafting (T1→T4).", "it": "Craftalo, poi portalo su con il Transfer Crafting (T1→T4)." }, "alt": { "en": "Nuakum armor (Ferocious Horn Den, item level 86)", "it": "Armatura Nuakum (Ferocious Horn Den, item level 86)" }, "match": ["dragon lord"] },
    { "slot": "shoulder", "item": { "en": "Splendent Dragon Lord Pauldrons", "it": "Splendent Dragon Lord Pauldrons" }, "how": { "en": "Craft them, then raise them through Transfer Crafting (T1→T4).", "it": "Craftali, poi portali su con il Transfer Crafting (T1→T4)." }, "alt": { "en": "Nuakum armor (Ferocious Horn Den, item level 86)", "it": "Armatura Nuakum (Ferocious Horn Den, item level 86)" }, "match": ["dragon lord"] },
    { "slot": "torso", "item": { "en": "Splendent Dragon Lord Chest", "it": "Splendent Dragon Lord Chest" }, "how": { "en": "Craft it, then raise it through Transfer Crafting (T1→T4).", "it": "Craftalo, poi portalo su con il Transfer Crafting (T1→T4)." }, "alt": { "en": "Nuakum armor (Ferocious Horn Den, item level 86)", "it": "Armatura Nuakum (Ferocious Horn Den, item level 86)" }, "match": ["dragon lord"] },
    { "slot": "gloves", "item": { "en": "Splendent Dragon Lord Gloves", "it": "Splendent Dragon Lord Gloves" }, "how": { "en": "Craft them, then raise them through Transfer Crafting (T1→T4).", "it": "Craftali, poi portali su con il Transfer Crafting (T1→T4)." }, "alt": { "en": "Nuakum armor (Ferocious Horn Den, item level 86)", "it": "Armatura Nuakum (Ferocious Horn Den, item level 86)" }, "match": ["dragon lord"] },
    { "slot": "pants", "item": { "en": "Splendent Dragon Lord Greaves", "it": "Splendent Dragon Lord Greaves" }, "how": { "en": "Craft them, then raise them through Transfer Crafting (T1→T4).", "it": "Craftali, poi portali su con il Transfer Crafting (T1→T4)." }, "alt": { "en": "Nuakum armor (Ferocious Horn Den, item level 86)", "it": "Armatura Nuakum (Ferocious Horn Den, item level 86)" }, "match": ["dragon lord"] },
    { "slot": "boots", "item": { "en": "Splendent Dragon Lord Boots", "it": "Splendent Dragon Lord Boots" }, "how": { "en": "Craft them, then raise them through Transfer Crafting (T1→T4).", "it": "Craftali, poi portali su con il Transfer Crafting (T1→T4)." }, "alt": { "en": "Nuakum armor (Ferocious Horn Den, item level 86)", "it": "Armatura Nuakum (Ferocious Horn Den, item level 86)" }, "match": ["dragon lord"] },
    { "slot": "cape", "item": { "en": "Splendent Dragon Lord Cloak", "it": "Splendent Dragon Lord Cloak" }, "how": { "en": "Craft it, then raise it through Transfer Crafting (T1→T4).", "it": "Craftalo, poi portalo su con il Transfer Crafting (T1→T4)." }, "alt": { "en": "Vakron armor (Vakron Sky Island, item level 70)", "it": "Armatura Vakron (Vakron Sky Island, item level 70)" }, "match": ["dragon lord"] },
    { "slot": "earring", "item": { "en": "Splendent Dragon Lord Earrings", "it": "Splendent Dragon Lord Earrings" }, "how": { "en": "Craft them, then raise them through Transfer Crafting (T1→T4).", "it": "Craftali, poi portali su con il Transfer Crafting (T1→T4)." }, "alt": { "en": "Enraged Kromede accessories (Fire Temple, item level 86)", "it": "Accessori di Enraged Kromede (Fire Temple, item level 86)" }, "match": ["dragon lord"] },
    { "slot": "necklace", "item": { "en": "Splendent Dragon Lord Necklace", "it": "Splendent Dragon Lord Necklace" }, "how": { "en": "Craft it, then raise it through Transfer Crafting (T1→T4).", "it": "Craftala, poi portala su con il Transfer Crafting (T1→T4)." }, "alt": { "en": "Enraged Kromede accessories (Fire Temple, item level 86)", "it": "Accessori di Enraged Kromede (Fire Temple, item level 86)" }, "match": ["dragon lord"] },
    { "slot": "ring", "item": { "en": "Splendent Dragon Lord Rings", "it": "Splendent Dragon Lord Rings" }, "how": { "en": "Craft them, then raise them through Transfer Crafting (T1→T4).", "it": "Craftali, poi portali su con il Transfer Crafting (T1→T4)." }, "alt": { "en": "Enraged Kromede accessories (Fire Temple, item level 86)", "it": "Accessori di Enraged Kromede (Fire Temple, item level 86)" }, "match": ["dragon lord"] },
    { "slot": "bracelet", "item": { "en": "Abyssal Bracelet", "it": "Abyssal Bracelet" }, "how": { "en": "Ludra raid (Abyssal Forge: Ludra) or the Sanctuary.", "it": "Raid di Ludra (Abyssal Forge: Ludra) o Sanctuary." }, "alt": { "en": "Ascension Bracelet", "it": "Ascension Bracelet" }, "match": ["abyssal bracelet"] },
    { "slot": "belt", "item": { "en": "Noble Belt", "it": "Noble Belt" }, "how": { "en": "Keep upgrading it: it is never replaced.", "it": "Continua a potenziarla: non si sostituisce mai." }, "match": ["noble belt"] },
    { "slot": "amulet", "item": { "en": "Revelation Amulet", "it": "Revelation Amulet" }, "how": { "en": "Upgrade it to +10 with scrolls from feathers, then upgrade it to blue in Substance Morph.", "it": "Portalo a +10 con le pergamene delle piume, poi portalo a blu in Substance Morph." }, "match": ["revelation amulet", "fierce battle amulet"] },
    { "slot": "rune", "item": { "en": "Clash Rune", "it": "Clash Rune" }, "how": { "en": "Regional quests (J → Regionals) and the quest chain starting with \"Hugo\". Upgrade each once (+1).", "it": "Missioni regionali (J → Regionals) e la catena di missioni che inizia con \"Hugo\". Potenzia ciascuna una volta (+1)." }, "match": ["clash rune"] }
  ],
  "weapons": {
    "gladiator": { "item": { "en": "Splendent Dragon Lord Greatsword", "it": "Splendent Dragon Lord Greatsword" }, "match": ["dragon lord", "ludra"] },
    "templar": { "item": { "en": "Splendent Dragon Lord Longsword", "it": "Splendent Dragon Lord Longsword" }, "match": ["dragon lord", "ludra"] },
    "assassin": { "item": { "en": "Splendent Dragon Lord Dagger", "it": "Splendent Dragon Lord Dagger" }, "match": ["dragon lord", "ludra"] },
    "ranger": { "item": { "en": "Splendent Dragon Lord Bow", "it": "Splendent Dragon Lord Bow" }, "match": ["dragon lord", "ludra"] },
    "sorcerer": { "item": { "en": "Splendent Dragon Lord Spellbook", "it": "Splendent Dragon Lord Spellbook" }, "match": ["dragon lord", "ludra"] },
    "spirit-master": { "item": { "en": "Splendent Dragon Lord Orb", "it": "Splendent Dragon Lord Orb" }, "match": ["dragon lord", "ludra"] },
    "cleric": { "item": { "en": "Splendent Dragon Lord Mace", "it": "Splendent Dragon Lord Mace" }, "match": ["dragon lord", "ludra"] },
    "chanter": { "item": { "en": "Splendent Dragon Lord Staff", "it": "Splendent Dragon Lord Staff" }, "match": ["dragon lord", "ludra"] }
  },
  "groups": {
    "endgame": { "en": "What to aim for in each slot at the Season 1 cap (item level 102), and how many players use it right now. Elyos items are called Wise, Asmodian ones Ebony.", "it": "Cosa puntare in ogni slot al tetto della Season 1 (item level 102), e quanti giocatori lo usano adesso. Per gli Elyos gli item si chiamano Wise, per gli Asmodian Ebony." },
    "wings": { "en": "Which wings to equip now, and which ones are worth leveling up.", "it": "Quali ali equipaggiare adesso, e quali conviene potenziare." },
    "enhancing": { "en": "Which bonuses to go for first when enhancing gear.", "it": "Quali bonus cercare per primi quando potenzi l'equip." },
    "titles": { "en": "You equip 3 titles: one offensive, one defensive and one special. Every title you own also gives a small permanent bonus.", "it": "Si equipaggiano 3 titoli: uno offensivo, uno difensivo e uno speciale. Ogni titolo che possiedi dà comunque un piccolo bonus permanente." },
    "stones": { "en": "Theostones add a chance-on-hit effect to weapon and guard (mostly matters in PvP). Manastones add stat lines to your gear.", "it": "Le Theostone aggiungono a arma e guard un effetto con probabilità sul colpo (conta soprattutto in PvP). Le Manastone aggiungono righe di statistiche all'equip." },
    "pantheon": { "en": "Collectible paintings, statues and one colossus that give divine stats.", "it": "Dipinti, statue e un colosso da collezionare, che danno statistiche divine." }
  }
}
```

- [ ] **Step 3: Implement `src/lib/gear.ts`**

```ts
// src/lib/gear.ts
import { z } from "zod";
import metaRaw from "@content/gear/meta.json";
import globalRaw from "@content/gear/usage/global.json";
import krRaw from "@content/gear/usage/kr.json";
import twRaw from "@content/gear/usage/tw.json";
import { FullTextSchema } from "./text";
import { CLASSES } from "./classes";
import type { RegionId } from "./regions";
import { GEAR_SLOTS, GearUsageSchema, type ClassUsage, type GearUsage, type UsageEntry } from "./gear-usage-parser";

export const GEAR_GROUPS = ["endgame", "wings", "enhancing", "titles", "stones", "pantheon"] as const;
export type GearGroupId = (typeof GEAR_GROUPS)[number];

const Match = z.array(z.string().regex(/^[a-z0-9' ]+$/, "lowercase fragments only")).min(1);
const GearMetaSchema = z
  .object({
    updated: z.iso.date(),
    sources: z.array(z.object({ label: z.string().min(1), url: z.url(), date: z.iso.date() })).min(1),
    slots: z.array(z.object({ slot: z.enum(GEAR_SLOTS), item: FullTextSchema, how: FullTextSchema, alt: FullTextSchema.optional(), match: Match })),
    weapons: z.record(z.string(), z.object({ item: FullTextSchema, match: Match })),
    groups: z.record(z.enum(GEAR_GROUPS), FullTextSchema),
  })
  .refine((m) => GEAR_SLOTS.every((s) => m.slots.filter((x) => x.slot === s).length === 1), "every slot exactly once")
  .refine((m) => CLASSES.every((c) => m.weapons[c.id]), "a weapon for every class");

export const GEAR_META = GearMetaSchema.parse(metaRaw);

const USAGE: Record<RegionId, GearUsage> = {
  global: GearUsageSchema.parse(globalRaw),
  kr: GearUsageSchema.parse(krRaw),
  tw: GearUsageSchema.parse(twRaw),
};

export type ClassGear = { fetchedAt: string; usage: ClassUsage };
export type RegionGear = Partial<Record<RegionId, ClassGear>>;

// Only this class's slice goes to the client component.
export function gearUsageFor(classId: string): RegionGear {
  const out: RegionGear = {};
  for (const [region, file] of Object.entries(USAGE) as [RegionId, GearUsage][]) {
    const usage = file.classes[classId];
    if (usage) out[region] = { fetchedAt: file.fetchedAt, usage };
  }
  return out;
}

export const normGear = (name: string) => name.toLowerCase().replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim();

export function findMatch(entries: UsageEntry[] | undefined, match: string[]): UsageEntry | undefined {
  return entries?.find((e) => match.some((m) => normGear(e.name).includes(m)));
}
```

Run: `pnpm test src/lib/gear.test.ts`
Expected: PASS.

- [ ] **Step 4: Full suite and commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: everything passes.

```bash
git add content/gear/meta.json src/lib/gear.ts src/lib/gear.test.ts
git -c user.name="Davide Sidoti" -c user.email="sidotidavide@gmail.com" commit -m "feat: curated endgame gear meta and gear usage module

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Split "Gear & more" into explained sub-groups

**Files:**
- Modify: `src/components/builds/build-section.tsx`, `src/app/[locale]/builds/[classId]/page.tsx`, `messages/en.json`, `messages/it.json`
- Create: `e2e/gear.spec.ts`

**Interfaces:**
- Consumes: `GEAR_GROUPS`, `GEAR_META.groups` from Task 3.
- Produces:
  - `BuildGroup({ id, title, hint, children })` in `build-section.tsx`
  - `SECTIONS` = `["skills","stigmas","arcana","boards","soulbind","endgame","wings","enhancing","titles","stones","pantheon","media","links"]`
  - message keys `builds.groups.<GearGroupId>` and `builds.nav.<GearGroupId>`
  - an `#endgame` group that Task 5 fills

- [ ] **Step 1: Write the failing e2e test**

```ts
// e2e/gear.spec.ts
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("dialog", { name: "Welcome to AionTools" }).getByRole("button", { name: "Skip" }).click();
});

test("gear sub-groups have their own anchors, below the sticky header", async ({ page }) => {
  await page.goto("/en/builds/ranger");
  for (const [link, id] of [["Endgame gear", "endgame"], ["Titles", "titles"], ["Stones", "stones"], ["Pantheon", "pantheon"]]) {
    await page.getByRole("navigation", { name: "Builds" }).getByRole("link", { name: link, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await page.waitForTimeout(300);
    const headerBottom = await page.locator("main header").first().evaluate((el) => el.getBoundingClientRect().bottom);
    const titleTop = await page.locator(`#${id}-title`).evaluate((el) => el.getBoundingClientRect().top);
    expect(titleTop, id).toBeGreaterThanOrEqual(headerBottom);
  }
  await expect(page.getByText("Offensive titles", { exact: true })).toBeVisible();
  await expect(page.getByText(/You equip 3 titles/)).toBeVisible();
});
```

The nav's accessible name comes from `t("title")` = "Builds". Check it in `messages/en.json` under `builds.title`.

Run: `pnpm build && pnpm exec playwright test e2e/gear.spec.ts`
Expected: FAIL, because there is no "Endgame gear" link.

- [ ] **Step 2: Add `BuildGroup`**

Append to `src/components/builds/build-section.tsx`:

```tsx
// A titled, explained sub-group inside a build section, with its own anchor.
export function BuildGroup({ id, title, hint, children }: { id: string; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div id={id} role="group" aria-labelledby={`${id}-title`} className="scroll-mt-64 space-y-2 border-t border-border/60 pt-3">
      <h3 id={`${id}-title`} className="font-medium">{title}</h3>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Messages**

In `builds.nav`, remove `"gear"` and add these keys. The values are the same as `builds.groups` below.

| Key | EN | IT |
|---|---|---|
| `endgame` | Endgame gear | Equip end game |
| `wings` | Wings | Ali |
| `enhancing` | Enhancing | Potenziamento |
| `titles` | Titles | Titoli |
| `stones` | Stones | Pietre |
| `pantheon` | Pantheon | Pantheon |

Add `builds.gearTitle`: EN "Gear & more", IT "Equip e altro". This is the h2 of the section, which keeps `id="gear"` but no longer has a nav entry.

Add a `builds.groups` object with the same six keys and values as the table above.

Change these existing `builds` values so each label stands on its own:

| Key | EN | IT |
|---|---|---|
| `wingsMeta` | Wings to equip | Ali da equipaggiare |
| `wingsLeveling` | Wings to level up | Ali da potenziare |
| `titlesOffensive` | Offensive titles | Titoli offensivi |
| `titlesDefensive` | Defensive titles | Titoli difensivi |
| `titlesSpecial` | Special titles | Titoli speciali |

- [ ] **Step 4: Restructure the page**

In `src/app/[locale]/builds/[classId]/page.tsx`:
- Import `BuildGroup` alongside `BuildSection`, and import `{ GEAR_META }` from `@/lib/gear`.
- Replace `SECTIONS` with:

```ts
const SECTIONS = ["skills", "stigmas", "arcana", "boards", "soulbind", "endgame", "wings", "enhancing", "titles", "stones", "pantheon", "media", "links"] as const;
```

- Add a helper inside the component: `const hint = (g: keyof typeof GEAR_META.groups) => GEAR_META.groups[g][locale === "it" ? "it" : "en"];`
- Replace the whole `<BuildSection id="gear" …>…</BuildSection>` block with:

```tsx
      <BuildSection id="gear" title={t("gearTitle")}>
        <BuildGroup id="endgame" title={t("groups.endgame")} hint={hint("endgame")}>
          {/* Task 5 fills this group */}
          <span />
        </BuildGroup>
        <BuildGroup id="wings" title={t("groups.wings")} hint={hint("wings")}>
          {dl([
            [t("wingsMeta"), b.wings.meta],
            [t("wingsLeveling"), b.wings.leveling],
          ])}
        </BuildGroup>
        <BuildGroup id="enhancing" title={t("groups.enhancing")} hint={hint("enhancing")}>
          <Priority items={b.enhancing} />
        </BuildGroup>
        <BuildGroup id="titles" title={t("groups.titles")} hint={hint("titles")}>
          {dl([
            [t("titlesOffensive"), <Priority key="o" items={b.titles.offensive} />],
            [t("titlesDefensive"), <Priority key="d" items={b.titles.defensive} />],
            [t("titlesSpecial"), <Priority key="s" items={b.titles.special} />],
          ])}
        </BuildGroup>
        <BuildGroup id="stones" title={t("groups.stones")} hint={hint("stones")}>
          {dl([
            [t("theostones"), T(b.theostones)],
            [t("manastones"), <Priority key="m" items={b.manastones} />],
          ])}
        </BuildGroup>
        <BuildGroup id="pantheon" title={t("groups.pantheon")} hint={hint("pantheon")}>
          {dl([
            [t("colossus"), T(b.pantheon.colossus)],
            [t("statues"), T(b.pantheon.statues)],
            [t("paintings"), T(b.pantheon.paintings)],
          ])}
        </BuildGroup>
      </BuildSection>
```

The defensive titles previously used `join(" / ")`. They now use `Priority` like the other two. **Ruling:** the sheet lists them in priority order (`>`/`/`-separated, split the same way by the parser). Cost if wrong: a "›" instead of a "/".

- [ ] **Step 5: Verify**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all pass. The `tests/i18n-keys.test.ts` key-parity test catches an EN/IT mismatch.

Run: `pnpm build && pnpm exec playwright test e2e/gear.spec.ts e2e/builds.spec.ts`
Expected: all pass, including the 375 px no-sideways-scroll test.

- [ ] **Step 6: Commit**

```bash
git add -A
git -c user.name="Davide Sidoti" -c user.email="sidotidavide@gmail.com" commit -m "feat: split build gear into explained sub-groups with their own anchors

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Endgame gear table, title shares and most-used wings

**Files:**
- Create: `src/components/builds/gear-usage.tsx`, `src/components/builds/gear-usage.test.tsx`
- Modify: `src/app/[locale]/builds/[classId]/page.tsx`, `messages/en.json`, `messages/it.json`, `e2e/gear.spec.ts`

**Interfaces:**
- Consumes:
  - from Task 3: `RegionGear`, `findMatch`, `normGear`, `GEAR_META`, `gearUsageFor`
  - from Task 1: `GearSlot`, `UsageEntry`
  - `useUserStore` (`hydrated`, `data.settings.region`)
- Produces (all `"use client"`):
  - `type EndgameRow = { slot: GearSlot; label: string; item: string; how: string; alt?: string; match: string[] }`
  - `EndgameGear({ rows, gear, curated }: { rows: EndgameRow[]; gear: RegionGear; curated: { updated: string; sources: { label: string; url: string }[] } })`
  - `TitlesWithShare({ names, gear }: { names: string[]; gear: RegionGear })`
  - `TopUsed({ kind, gear }: { kind: "wings"; gear: RegionGear })`

- [ ] **Step 1: Write the failing component tests**

```tsx
// src/components/builds/gear-usage.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/en.json";
import { useUserStore } from "@/store/user-store";
import { createDefaultUserData, type UserData } from "@/lib/user-data";
import type { RegionGear } from "@/lib/gear";
import { EndgameGear, TitlesWithShare, type EndgameRow } from "./gear-usage";

const usage = (weapon: [string, number][], sample: number) => ({
  sample,
  sourceUrls: ["https://gamewith.ai/aion2/en/build-stats/nae/ranger"],
  slots: { weapon: weapon.map(([name, share]) => ({ name, share })), belt: [{ name: "Noble Belt", share: 40 }] },
  titles: [{ name: "Saint of Verteron", share: 11 }],
  wings: [],
});
const gear: RegionGear = {
  global: { fetchedAt: "2026-10-07", usage: usage([["Spiritforged Bow", 84], ["Aulamus Bow", 8], ["Rupture Longbow", 2]], 1785) },
  tw: { fetchedAt: "2026-10-07", usage: usage([["Splendent Genesis Dragon Lord Bow", 61]], 1080) },
};
const rows: EndgameRow[] = [
  { slot: "weapon", label: "Weapon", item: "Splendent Dragon Lord Bow", how: "Craft it", match: ["dragon lord", "ludra"] },
  { slot: "belt", label: "Belt", item: "Noble Belt", how: "Keep upgrading it", match: ["noble belt"] },
];
const curated = { updated: "2026-10-13", sources: [{ label: "Aion2 Guidance", url: "https://aion2guidance.com/en/gear" }] };

const setRegion = (region: UserData["settings"]["region"], hydrated = true) => {
  const d = createDefaultUserData(new Date("2026-10-14T10:00:00.000Z"));
  useUserStore.setState({ data: { ...d, settings: { ...d.settings, region } }, hydrated });
};
const renderGear = () =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <EndgameGear rows={rows} gear={gear} curated={curated} />
    </NextIntlClientProvider>,
  );

beforeEach(() => setRegion("global"));

describe("EndgameGear", () => {
  it("shows the recommendation, its share when used, and 'uncommon' when not in the top 3", () => {
    renderGear();
    const weapon = screen.getByRole("row", { name: /Weapon/ });
    expect(within(weapon).getByText("Splendent Dragon Lord Bow")).toBeInTheDocument();
    expect(within(weapon).getByText("Uncommon")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /Belt/ })).getByText("Used by 40%")).toBeInTheDocument();
    expect(screen.getByText(/GameWith, Oct 7, 2026, 1,785 characters/)).toBeInTheDocument();
  });
  it("lists the most used items for a slot", () => {
    renderGear();
    expect(within(screen.getByRole("row", { name: /Weapon/ })).getByText("Spiritforged Bow")).toBeInTheDocument();
  });
  it("switches to the stored region and hides the curated columns outside Global", () => {
    setRegion("tw");
    renderGear();
    expect(screen.getByText(/later season/)).toBeInTheDocument();
    expect(screen.queryByText("Splendent Dragon Lord Bow")).not.toBeInTheDocument();
    expect(screen.getByText("Splendent Genesis Dragon Lord Bow")).toBeInTheDocument();
  });
  it("renders Global until the store has hydrated", () => {
    setRegion("tw", false);
    renderGear();
    expect(screen.queryByText(/later season/)).not.toBeInTheDocument();
  });
});

describe("TitlesWithShare", () => {
  it("adds the usage share next to titles that match", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <TitlesWithShare names={["Saint of Verteron", "Rule All Creation"]} gear={gear} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Saint of Verteron").parentElement).toHaveTextContent("11%");
    expect(screen.getByText("Rule All Creation").parentElement).not.toHaveTextContent("%");
  });
});
```

Run: `pnpm test src/components/builds/gear-usage.test.tsx`
Expected: FAIL, because `./gear-usage` does not exist.

- [ ] **Step 2: Messages**

Add a `builds.endgame` object in EN:

```json
"endgame": {
  "slot": "Slot",
  "recommended": "Recommended",
  "how": "How to get it",
  "usage": "Players now",
  "alt": "Alternative: {alt}",
  "usedBy": "Used by {share}%",
  "uncommon": "Uncommon",
  "mostUsed": "Most used",
  "laterSeason": "This region is in a later season; showing what players use there.",
  "source": "Usage data: GameWith, {date}, {sample} characters.",
  "sourceLink": "Source {n}",
  "curated": "Meta curated on {date}. Sources:",
  "mostUsedNow": "Most used now",
  "slots": {
    "weapon": "Weapon", "guard": "Guard", "helmet": "Helm", "shoulder": "Pauldrons", "torso": "Chest",
    "gloves": "Gloves", "pants": "Greaves", "boots": "Boots", "cape": "Cloak", "earring": "Earrings",
    "necklace": "Necklace", "ring": "Rings", "bracelet": "Bracelets", "belt": "Belt", "amulet": "Amulet", "rune": "Runes"
  }
}
```

And in IT:

```json
"endgame": {
  "slot": "Slot",
  "recommended": "Consigliato",
  "how": "Come ottenerlo",
  "usage": "Giocatori ora",
  "alt": "Alternativa: {alt}",
  "usedBy": "Usato dal {share}%",
  "uncommon": "Poco diffuso",
  "mostUsed": "Più usati",
  "laterSeason": "Questa regione è in una stagione successiva: mostro cosa usano lì i giocatori.",
  "source": "Dati d'uso: GameWith, {date}, {sample} personaggi.",
  "sourceLink": "Fonte {n}",
  "curated": "Meta curato il {date}. Fonti:",
  "mostUsedNow": "I più usati adesso",
  "slots": {
    "weapon": "Arma", "guard": "Guard", "helmet": "Elmo", "shoulder": "Spalline", "torso": "Corazza",
    "gloves": "Guanti", "pants": "Gambali", "boots": "Stivali", "cape": "Mantello", "earring": "Orecchini",
    "necklace": "Collana", "ring": "Anelli", "bracelet": "Bracciali", "belt": "Cintura", "amulet": "Amuleto", "rune": "Rune"
  }
}
```

`{sample}` is a number: pass it formatted (see the component), so ICU prints it as is.

- [ ] **Step 3: Implement the components**

```tsx
// src/components/builds/gear-usage.tsx
"use client";
import { useLocale, useTranslations } from "next-intl";
import { useUserStore } from "@/store/user-store";
import { findMatch, normGear, type RegionGear } from "@/lib/gear";
import type { GearSlot, UsageEntry } from "@/lib/gear-usage-parser";
import type { RegionId } from "@/lib/regions";

export type EndgameRow = { slot: GearSlot; label: string; item: string; how: string; alt?: string; match: string[] };

// Server HTML and the first client render use Global; the stored region applies once the store has hydrated.
function useUsageRegion(): RegionId {
  const hydrated = useUserStore((s) => s.hydrated);
  const region = useUserStore((s) => s.data.settings.region);
  return hydrated ? region : "global";
}

function useFormat() {
  const locale = useLocale();
  return {
    pct: (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n),
    num: (n: number) => new Intl.NumberFormat(locale).format(n),
    date: (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(iso)),
  };
}

function ItemName({ name, icon }: { name: string; icon?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element -- small self-hosted game icons
        <img src={icon} alt="" width={28} height={28} className="size-7 rounded" loading="lazy" />
      ) : null}
      <span>{name}</span>
    </span>
  );
}

function EntryList({ entries }: { entries: UsageEntry[] }) {
  const f = useFormat();
  return (
    <ul className="space-y-1">
      {entries.map((e) => (
        <li key={e.name} className="flex flex-wrap items-center gap-x-2">
          <ItemName name={e.name} icon={e.icon} />
          <span className="font-mono text-xs text-muted-foreground">
            {f.pct(e.share)}%{e.enhance !== undefined && ` · +${e.enhance}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function EndgameGear({ rows, gear, curated }: { rows: EndgameRow[]; gear: RegionGear; curated: { updated: string; sources: { label: string; url: string }[] } }) {
  const t = useTranslations("builds.endgame");
  const f = useFormat();
  const region = useUsageRegion();
  const g = gear[region];
  const showCurated = region === "global";
  return (
    <div className="space-y-3">
      {!showCurated && <p role="note" className="rounded-md border border-border bg-background/40 p-2 text-sm">{t("laterSeason")}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1 pr-3 font-normal">{t("slot")}</th>
              {showCurated && <th className="py-1 pr-3 font-normal">{t("recommended")}</th>}
              {showCurated && <th className="py-1 pr-3 font-normal">{t("how")}</th>}
              <th className="py-1 font-normal">{t("usage")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const entries = g?.usage.slots[r.slot];
              const hit = findMatch(entries, r.match);
              return (
                <tr key={r.slot} className="border-t border-border/60 align-top">
                  <th scope="row" className="py-2 pr-3 text-left font-normal text-muted-foreground">{r.label}</th>
                  {showCurated && (
                    <td className="py-2 pr-3"><ItemName name={r.item} icon={hit?.icon} /></td>
                  )}
                  {showCurated && (
                    <td className="py-2 pr-3">
                      {r.how}
                      {r.alt && <p className="text-xs text-muted-foreground">{t("alt", { alt: r.alt })}</p>}
                    </td>
                  )}
                  <td className="py-2">
                    {showCurated && g && (hit ? <p>{t("usedBy", { share: f.pct(hit.share) })}</p> : <p className="text-muted-foreground">{t("uncommon")}</p>)}
                    {entries && entries.length > 0 && (showCurated ? (
                      <details>
                        <summary className="inline-flex min-h-11 cursor-pointer items-center text-xs text-primary">{t("mostUsed")}</summary>
                        <EntryList entries={entries} />
                      </details>
                    ) : (
                      <EntryList entries={entries} />
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <footer className="space-y-1 text-xs text-muted-foreground">
        {g && (
          <p>
            {t("source", { date: f.date(g.fetchedAt), sample: f.num(g.usage.sample) })}{" "}
            {g.usage.sourceUrls.map((u, i) => (
              <a key={u} href={u} target="_blank" rel="noreferrer" className="mr-2 inline-flex min-h-11 items-center text-primary underline underline-offset-2">
                {t("sourceLink", { n: i + 1 })}
              </a>
            ))}
          </p>
        )}
        {showCurated && (
          <p>
            {t("curated", { date: f.date(curated.updated) })}{" "}
            {curated.sources.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="mr-2 inline-flex min-h-11 items-center text-primary underline underline-offset-2">
                {s.label}
              </a>
            ))}
          </p>
        )}
      </footer>
    </div>
  );
}

export function TitlesWithShare({ names, gear }: { names: string[]; gear: RegionGear }) {
  const f = useFormat();
  const titles = gear[useUsageRegion()]?.usage.titles ?? [];
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
      {names.map((name, i) => {
        const hit = titles.find((e) => normGear(e.name) === normGear(name));
        return (
          <li key={`${i}-${name}`} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted-foreground" aria-hidden>›</span>}
            <span>
              <span>{name}</span>
              {hit && <span className="ml-1 font-mono text-xs text-muted-foreground">{f.pct(hit.share)}%</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function TopUsed({ kind, gear }: { kind: "wings"; gear: RegionGear }) {
  const t = useTranslations("builds.endgame");
  const entries = gear[useUsageRegion()]?.usage[kind] ?? [];
  if (entries.length === 0) return null;
  return (
    <div className="space-y-1">
      <h4 className="text-xs text-muted-foreground">{t("mostUsedNow")}</h4>
      <EntryList entries={entries} />
    </div>
  );
}
```

Run: `pnpm test src/components/builds/gear-usage.test.tsx`
Expected: PASS.

If `getByRole("row", { name: /Weapon/ })` doesn't resolve (a row's accessible name comes from its cells), switch the query to `screen.getByRole("rowheader", { name: "Weapon" }).closest("tr")!`. Ledger a ruling.

- [ ] **Step 4: Wire into the page**

In `src/app/[locale]/builds/[classId]/page.tsx`:
- Import `{ GEAR_META, gearUsageFor }` from `@/lib/gear` (extending the Task 4 import), and `{ EndgameGear, TitlesWithShare, TopUsed, type EndgameRow }` from `@/components/builds/gear-usage`.
- Import `getTranslations` for the slot labels. Reuse `t` with `t(\`endgame.slots.${slot}\`)`.
- Inside the component, after `T`:

```tsx
  const L = (x: { en: string; it: string }) => x[locale === "it" ? "it" : "en"];
  const gear = gearUsageFor(classId);
  const weapon = GEAR_META.weapons[classId];
  const rows: EndgameRow[] = GEAR_META.slots.map((s) => ({
    slot: s.slot,
    label: t(`endgame.slots.${s.slot}`),
    item: L(s.slot === "weapon" ? weapon.item : s.item),
    how: L(s.how),
    alt: s.alt && L(s.alt),
    match: s.slot === "weapon" ? weapon.match : s.match,
  }));
```

- Replace the `hint` helper from Task 4 with `const hint = (g: keyof typeof GEAR_META.groups) => L(GEAR_META.groups[g]);`.
- In the `endgame` group, replace the placeholder `<span />` and its comment with:

```tsx
          <EndgameGear rows={rows} gear={gear} curated={{ updated: GEAR_META.updated, sources: GEAR_META.sources.map(({ label, url }) => ({ label, url })) }} />
```

- In the `wings` group, add `<TopUsed kind="wings" gear={gear} />` after the `dl(...)`.
- In the `titles` group, replace the three `Priority` elements with `TitlesWithShare`, keeping the same keys:

```tsx
            [t("titlesOffensive"), <TitlesWithShare key="o" names={b.titles.offensive} gear={gear} />],
            [t("titlesDefensive"), <TitlesWithShare key="d" names={b.titles.defensive} gear={gear} />],
            [t("titlesSpecial"), <TitlesWithShare key="s" names={b.titles.special} gear={gear} />],
```

- [ ] **Step 5: Extend the e2e test**

Append to `e2e/gear.spec.ts`:

```ts
test("endgame gear shows Global usage, and TW usage after switching region", async ({ page }) => {
  await page.goto("/en/builds/ranger");
  const endgame = page.locator("#endgame");
  await expect(endgame.getByText(/Usage data: GameWith, .*characters/)).toBeVisible();
  await expect(endgame.getByText("Splendent Dragon Lord Bow")).toBeVisible();

  await page.evaluate(() => {
    const key = "aiontools:user-data";
    const data = JSON.parse(localStorage.getItem(key)!);
    data.settings.region = "tw";
    localStorage.setItem(key, JSON.stringify(data));
  });
  await page.reload();
  await expect(endgame.getByText(/later season/)).toBeVisible();
  await expect(endgame.getByText("Splendent Dragon Lord Bow")).toHaveCount(0);
});
```

- [ ] **Step 6: Verify everything**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e`
Expected: every command exits 0. That includes the 375 px no-sideways-scroll checks: the table scrolls inside its own `overflow-x-auto` box.

- [ ] **Step 7: Commit**

```bash
git add -A
git -c user.name="Davide Sidoti" -c user.email="sidotidavide@gmail.com" commit -m "feat: endgame gear table with GameWith usage, title shares and most-used wings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
