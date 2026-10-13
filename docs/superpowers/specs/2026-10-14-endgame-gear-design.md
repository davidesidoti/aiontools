# Endgame Gear and Clearer Build Sections — Design Spec

Date: 2026-10-14
Status: approved in brainstorming, awaiting written-spec review
Extends: `docs/superpowers/specs/2026-10-13-aiontools-design.md` (its stack, i18n, dark-only theme, testing and deploy rules still apply)

## 1. Goal

Two improvements to the class build pages:

1. **Endgame gear meta.** Show which gear to aim for in each slot, and how many real players actually use it.
2. **Clearer "Gear & more" section.** Today it is one flat list where labels such as "Offensive" give no hint that they are titles. Split it into named sub-groups, each with a one-line explanation.

### What we learned in research (2026-10-13)

- Global launched on 2026-10-05, so the global meta has not settled. Most "endgame" advice is carried over from TW.
- Gear choice is **the same for all 8 classes**: every slot uses the same item family and only the weapon type changes. Class differences live in stat priorities, which the builds already have.
- The global Season 1 ceiling is item level 102:

| Slot | Recommended |
|---|---|
| Weapon, Guard | Crafted Splendent Wise (Elyos) / Ebony (Asmodian) Dragon Lord, or Ludra raid weapons |
| Armor, earrings, necklace, rings | Crafted Splendent Dragon Lord |
| Bracelets | Abyssal Bracelet |
| Belt, Amulet | Noble Belt, Revelation Amulet (upgraded, not replaced) |
| Runes | Clash Rune |

- **questlog.gg** terms forbid automated access and database reuse. Decision: leave the existing skill icons as they are, and **take nothing new from questlog** (no API calls, no icons).
- **GameWith** (`gamewith.ai/aion2/en/build-stats/{region}/{class}`) publishes per-class, per-region usage shares built from the official game APIs. Its pages are server-rendered and state no terms of use. It is the "confirmation" source.

## 2. Scope

In scope:

- A curated meta file (by hand), for the Global region only.
- An import script (run by hand after patches) that reads GameWith usage shares for every class and for these regions: `nae` and `eu` (merged into Global), `kr` and `tw`.
- Gear icons, self-hosted under `public/gear/`.
- A restructured "Gear & more" section on each build page, with sub-groups, explanations and anchors in the build's section nav.
- Usage shares shown next to the build's titles and wings when the names match.

Out of scope:

- Scheduled or automatic refresh.
- Meta per progression stage (item level 70, 86).
- Average stats and combat power benchmarks.
- A curated meta for KR or TW.
- Any new data from questlog.gg.

## 3. Data

### 3.1 Curated meta — `content/gear/meta.json`

Validated with Zod at module load, like other content.

```ts
type GearMeta = {
  updated: string;                 // ISO date of the last curation
  sources: { label: string; url: string; date: string }[];
  slots: {
    slot: GearSlot;                // see 3.3
    item: FullText;                // e.g. "Splendent Dragon Lord" (proper nouns stay English in IT)
    how: FullText;                 // how to get it
    alt?: FullText;                // free-to-play alternative
    match: string[];               // name fragments used to find this item in usage data
  }[];
  weapons: Record<ClassId, { item: FullText; match: string[] }>; // class-specific weapon line
  groups: Record<GearGroupId, FullText>; // one-line explanations for each sub-group (section 4)
};
```

`match` holds lowercase name fragments: an item in the usage data matches when its normalized name contains a fragment. For example, `"dragon lord"` matches both the Wise and the Ebony variant. Matching never uses questlog ids.

### 3.2 Usage shares — `content/gear/usage/{global,kr,tw}.json`

Written only by the import script.

```ts
type GearUsage = {
  region: "global" | "kr" | "tw";
  fetchedAt: string;               // the "data date" stated on GameWith pages (oldest one when merged)
  classes: Record<ClassId, {
    sample: number;                // characters sampled (sum of NA + EU for global)
    sourceUrls: string[];          // GameWith pages used
    slots: Partial<Record<GearSlot, UsageEntry[]>>; // top 3 per slot, share descending
    titles: UsageEntry[];          // top 10
    wings: UsageEntry[];           // top 5
  }>;
};
type UsageEntry = { name: string; icon?: string; share: number /* 0–100, one decimal */; enhance?: number };
```

**Global merge.** For each class, an item's share is `(shareNA × sampleNA + shareEU × sampleEU) / (sampleNA + sampleEU)`. An item missing from one region counts as 0 there. After merging, keep the top 3 per slot.

**Icons.** The script downloads each icon it keeps once, converts it to webp at 64 px, and saves it as `public/gear/<slug>.webp`. `icon` is that public path.

### 3.3 Slots

`GearGroupId` = `endgame | wings | enhancing | titles | stones | pantheon` (the sub-groups in section 4). `ClassId` is the existing class id from `src/lib/classes.ts`.

`GearSlot` = `weapon | guard | helmet | shoulder | torso | gloves | pants | boots | cape | earring | necklace | ring | bracelet | belt | amulet | rune`.

Paired slots (earrings, rings, bracelets, runes) are one slot each. The table is ordered as listed.

## 4. Build page UI

"Gear & more" becomes these sub-groups, in this order. Each has an `h3` heading, an explanation line from `meta.groups`, and an anchor in the section nav.

1. **Endgame gear** (new) — a table with one row per slot. Each row shows:
   - the recommended item and its icon, taken from the top usage entry that matches `match`;
   - how to get it, and the alternative, if any;
   - "used by N%" when a usage entry matches;
   - "uncommon", when nothing in the top 3 matches;
   - a disclosure listing the top 3 most used items, with icon, share and typical enhance.

   The weapon row uses the class's `weapons` entry. A footer reads "Usage data: GameWith, <date>, <sample> characters", with links to the source pages, plus "Meta curated <updated>" and the sources list.
2. **Wings** — the current meta/leveling lines, with usage share next to names that match.
3. **Enhancing** — the current priority list.
4. **Titles** — Offensive, Defensive and Special titles, with usage share next to names that match. The explanation: 3 equipped (attack, defense, utility); every title you own also gives a small permanent bonus.
5. **Stones** — Theostones and Manastones.
6. **Pantheon** — Colossus, Statues and Paintings.

Labels stand on their own, e.g. "Offensive titles", not "Offensive".

**Region.** The usage data follows the app's region setting: `global` → `global.json`, `kr` → `kr.json`, `tw` → `tw.json`.
- The server renders Global, and the client switches to the stored region after hydration.
- For KR or TW, the curated columns are hidden and a note says "This region is in a later season; showing what players use there."

**Translations.** Every new UI string goes in EN and IT. Item names stay in English, as the game's own names.

## 5. Import script — `scripts/import-gear-usage.mts`

- Fetches the 8 classes × 4 GameWith regions sequentially, with a 1 s delay between requests and a descriptive User-Agent.
- Parses each page into a typed object with a pure parser function (`src/lib/gear-usage-parser.ts`), so it can be unit-tested on saved HTML.
- Fails loudly and writes nothing if:
  - any page doesn't parse;
  - a class has zero slots;
  - the sample size is missing.
- Merges NA and EU, then writes the 3 JSON files and the icons. It prints a summary: classes, samples and data date per region.

## 6. Error handling

- Missing usage data for a class or region: the Endgame gear table shows only curated columns, and Titles and Wings show no shares.
- Invalid `meta.json`: the build fails at module load, which is the existing content rule.
- Icon missing on disk: show the item name without an icon, like skill chips do.

## 7. Testing

- **Unit, parser:** on a saved GameWith fixture page, check slots, shares, sample, data date and icons.
- **Unit, merge:** the weighted NA+EU share, an item present in only one region, and the top-3 cut.
- **Unit, matching:** fragment matching across faction variants; the "uncommon" case.
- **Unit, schema:** `meta.json` and the usage files validate, every class has a weapon line, and every slot is covered.
- **Component:** the Endgame gear row renders "used by N%", "uncommon" and the top-3 disclosure; the KR/TW note hides the curated columns.
- **e2e:**
  - a build page shows the Endgame gear table with the Global footer;
  - switching the region to TW in settings changes the footer to TW data;
  - each sub-group anchor is in the section nav.
