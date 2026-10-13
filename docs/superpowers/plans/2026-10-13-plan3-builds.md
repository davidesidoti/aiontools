# AionTools Plan 3 — Class Builds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a build page for each of the 8 classes, plus a class grid. Each page shows skills, passives and stigmas (with icons), arcana and god stats, equip-effect targets, Daevanion board priorities, soul binding per slot, wings, titles, theostones, manastones, pantheon, links and screenshots. The data comes from the "Personal Aion 2 Class Info" spreadsheet through a re-runnable import script.

**Architecture:**
- **Parser:** `parseClassTab(cells)` is pure and unit-tested. It turns one class tab (an address → text map) into a `ClassBuild`. Before reading anything, it checks the template's fixed labels and throws if the layout has changed.
- **Import script:** `scripts/import-builds.mts` downloads the xlsx, runs the parser on each class tab, extracts the screenshots, and writes `content/builds/<classId>.json`.
- **Icon script:** `scripts/import-skill-icons.mts` downloads the skill icons for each class from questlog.gg's public database API and the class icons from DaevaOS, and writes them under `public/icons/`. It also writes the `content/icons.json` name → path map.
- **Translations:** the few free-text phrases (theostone and pantheon notes, macro notes) are translated through a phrase glossary, `content/builds/it.json`, keyed by the English text. A re-import keeps every translation whose source text has not changed. A test fails when a phrase is missing from the glossary.
- **Pages:** `/[locale]/builds` and `/[locale]/builds/[classId]` are static server components.

**Tech Stack:** As in plans 1, 2 and 4. `exceljs` is already a dev dependency.

**Spec:** `docs/superpowers/specs/2026-10-13-aiontools-design.md`, sections 3 (routes), 4 (`ClassBuild`, icons), 8 (Builds) and 11 (Icons).

**Branch:** `feat/plan3-builds`, created from `feat/plan4-crafting-guides` (PR #3 is still open). Open the PR against `main` if #3 has merged by then, otherwise against `feat/plan4-crafting-guides`.

### Deliberate deviations from the spec

| Spec | Plan 3 | Why |
|---|---|---|
| `ClassBuild` fields (§4) | Fields follow the sheet's real template (see `ClassBuildSchema`). Wings, theostones and pantheon are kept as text; equip effects are lists of targets. | The template is the source of truth, and those cells are free text. |
| `content/i18n/it.json` keyed by id | `content/builds/it.json` is a phrase glossary keyed by the English text | The same sentences repeat across classes. A key based on the text survives re-imports and is translated only once. |
| Item and stat icons | Icons only for skills, passives, stigmas and classes | questlog's skills API maps skill names to icons reliably. There is no equivalent source for arcana, wings or titles, so those stay text. |
| Screenshots in a lightbox | A click opens the screenshot full size in a new tab | That is enough for now and avoids a dialog component. |

## Global Constraints

Everything from the plan 1, 2 and 4 Global Constraints still applies. This plan adds the following.

- **Class ids:** `chanter`, `ranger`, `cleric`, `spirit-master`, `gladiator`, `sorcerer`, `templar`, `assassin` (matching `CLASSES`). The source tabs and questlog categories map to them as follows:

  | Class id | Sheet tab | questlog `mainCategory` | DaevaOS icon |
  |---|---|---|---|
  | `chanter` | Chanter | `chanter` | `chanter` |
  | `ranger` | Ranger | `ranger` | `ranger` |
  | `cleric` | Cleric | `cleric` | `cleric` |
  | `spirit-master` | Spirit Master | `elementalist` | `elementalist` |
  | `gladiator` | Gladiator | `gladiator` | `gladiator` |
  | `sorcerer` | Sorcerer | `sorcerer` | `sorcerer` |
  | `templar` | Templar | `templar` | `templar` |
  | `assassin` | Assassin | `assassin` | `assassin` |

- **Name normalization:** names are matched with `normName(s) = s.toLowerCase().replace(/[^a-z]/g, "")`.
  - Sheet typos are fixed through `SKILL_ALIASES` in the parser. Once aliased, every skill, passive and stigma must have an icon (a test checks this). A name with no questlog icon can go into `KNOWN_MISSING_ICONS`, with a reason in a code comment.
- **Game names stay in English** in both locales. These are skill, stat, arcana, wing, title, slot and board names.
- **Translated through the glossary:** free-text sentences only. These are theostone notes, pantheon notes and screenshot/macro notes.
- **Polite network use:** the scripts run by hand, never at build time. They make one request per class plus one per icon, run in sequence, and send a descriptive `User-Agent`.
- **External assets:** icons are NCSoft game assets, self-hosted as decided in the spec (§11). Credit questlog.gg and DaevaOS in the README.
- **Git:** the same commit rules as before. Use `git -c user.name="Davide Sidoti" -c user.email="sidotidavide@gmail.com"` if needed. Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **The sheet layout changes** (a moved row, a renamed header). The import must fail loudly and name the cell, never write wrong JSON. Test: Task 2 (`parseClassTab` throws on a changed label).
2. **A skill typo in the sheet, or a skill missing from questlog.** The page must still render the name, without an icon instead of with a broken image, and the test must name the unresolved skill. Tests: Task 2 (aliases) and Task 3 (`every skill resolves to an icon or is a known gap`).
3. **A sheet sentence with no Italian translation.** It must fall back to English, never render blank, and a test must list the missing phrase. Test: Task 4.
4. **A bad class route** (`/en/builds/unknown`). It must return 404, not crash. Test: Task 6 e2e.
5. **Re-running the import on unchanged data.** The output must be byte-identical (stable ordering and formatting), so the diff stays empty. Check: Task 3, by running the import twice and confirming with `git status`.

---

## File Map

```
scripts/import-skill-icons.mts          questlog skills + DaevaOS class icons → public/icons, content/icons.json
scripts/import-builds.mts               sheet → content/builds/<id>.json + public/builds/<id>/shot-N.<ext>
src/lib/build-parser.ts                 parseClassTab, SKILL_ALIASES, normName (pure)
src/lib/builds.ts                       ClassBuildSchema, BUILDS, iconFor, classIcon, buildText
tests/fixtures/ranger-cells.json        fixture for the parser test
content/icons.json, content/builds/*.json, content/builds/it.json
src/app/[locale]/builds/page.tsx, src/app/[locale]/builds/[classId]/page.tsx
src/components/builds/skill-chip.tsx, build-section.tsx
src/components/shell/nav-items.ts, bottom-nav.tsx (modify)  Builds nav item
src/lib/search.ts (modify)              classes in the Ctrl+K palette
src/components/home/home-dashboard.tsx (modify)  class name links to its build
messages/en.json, messages/it.json      "builds" namespace, nav.builds, palette.groups.classes
e2e/builds.spec.ts, README.md
```

---

### Task 1: Skill and class icons

**Files:**
- Create: `scripts/import-skill-icons.mts`
- Generated:
  - `public/icons/skills/<classId>/<NAME>.webp`
  - `public/icons/classes/<classId>.webp`
  - `content/icons.json`

**Interfaces:**
- Produces `content/icons.json` with this shape:

```ts
{ classes: Record<classId, string>; skills: Record<classId, Record<normName, string>> }
```

  For example: `{ "classes": { "ranger": "/icons/classes/ranger.webp" }, "skills": { "ranger": { "snipe": "/icons/skills/ranger/ICON_RA_SKILL_001.webp" } } }`

- [ ] **Step 1: Write the script**

```ts
// scripts/import-skill-icons.mts
// One-off: skill icons from questlog.gg's database API and class icons from DaevaOS, self-hosted under public/icons.
// Run with `node scripts/import-skill-icons.mts`.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const CLASSES: Record<string, { questlog: string; daevaos: string }> = {
  chanter: { questlog: "chanter", daevaos: "chanter" },
  ranger: { questlog: "ranger", daevaos: "ranger" },
  cleric: { questlog: "cleric", daevaos: "cleric" },
  "spirit-master": { questlog: "elementalist", daevaos: "elementalist" },
  gladiator: { questlog: "gladiator", daevaos: "gladiator" },
  sorcerer: { questlog: "sorcerer", daevaos: "sorcerer" },
  templar: { questlog: "templar", daevaos: "templar" },
  assassin: { questlog: "assassin", daevaos: "assassin" },
};
const UA = { "user-agent": "aiontools-icon-import/1.0 (+https://github.com/davidesidoti/aiontools)" };
const normName = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

async function download(url: string, path: string) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
}

type QuestlogSkill = { name: string; icon: string; subCategory: string };

const icons: { classes: Record<string, string>; skills: Record<string, Record<string, string>> } = { classes: {}, skills: {} };
for (const [classId, src] of Object.entries(CLASSES)) {
  await download(`https://daevaos.com/game/classes/${src.daevaos}.webp`, `public/icons/classes/${classId}.webp`);
  icons.classes[classId] = `/icons/classes/${classId}.webp`;

  const input = encodeURIComponent(JSON.stringify({ language: "en", page: 1, mainCategory: src.questlog }));
  const res = await fetch(`https://questlog.gg/aion-2/api/trpc/database.getSkills?input=${input}`, { headers: UA });
  if (!res.ok) throw new Error(`${classId}: HTTP ${res.status}`);
  const data = (await res.json()).result.data as { pageCount: number; pageData: QuestlogSkill[] };
  if (data.pageCount !== 1 || data.pageData.length === 0) throw new Error(`${classId}: unexpected paging ${data.pageCount}/${data.pageData.length}`);

  const map: Record<string, string> = {};
  for (const s of [...data.pageData].sort((a, b) => a.name.localeCompare(b.name))) {
    // "/assets/Game/UI/.../ICON_RA_SKILL_038.ICON_RA_SKILL_038" → ".../ICON_RA_SKILL_038.webp"
    const assetPath = s.icon.replace(/\.[^./]+$/, "");
    const file = assetPath.split("/").pop()!;
    const local = `/icons/skills/${classId}/${file}.webp`;
    await download(`https://cdn.questlog.gg/aion-2${assetPath}.webp`, `public${local}`);
    map[normName(s.name)] = local;
  }
  icons.skills[classId] = map;
  console.log(`${classId}: ${Object.keys(map).length} skill icons`);
}
writeFileSync("content/icons.json", JSON.stringify(icons, null, 2) + "\n");
console.log("wrote content/icons.json");
```

- [ ] **Step 2: Run it**

Run: `node scripts/import-skill-icons.mts`

Expected:
- 8 lines of the form `<class>: ~35 skill icons`, then `wrote content/icons.json`, with no exception;
- about 280 `.webp` files under `public/icons/skills/`, and 8 under `public/icons/classes/`.

If an icon URL returns 404, open one questlog skill page in the browser and compare the CDN path, then fix the URL rule. Record the change as a ledger ruling.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: self-host class and skill icons from questlog.gg and DaevaOS

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Class tab parser

**Files:**
- Create: `src/lib/build-parser.ts`, `tests/fixtures/ranger-cells.json`
- Test: `src/lib/build-parser.test.ts`

**Interfaces:**
- Produces:
  - `type Cells = Record<string, string>`, an A1-address → trimmed text map
  - `normName(s: string): string`
  - `SKILL_ALIASES: Record<string, string>`, mapping a sheet name to the questlog name
  - `parseClassTab(cells: Cells): ParsedBuild`, defined below. It throws `Error("layout changed: <cell> …")` when a fixed label doesn't match.

```ts
type BuildSkill = { name: string; rank?: number; detail?: string };
type ParsedBuild = {
  skills: BuildSkill[]; passives: BuildSkill[]; stigmas: BuildSkill[];
  arcana: string[]; godStats: string[]; equipEffects: string[][];
  boards: { name: string; lines: { lines: string; priority: string[] }[] }[];
  wings: { meta: string; leveling: string };
  enhancing: string[];
  titles: { offensive: string[]; defensive: string[]; special: string[] };
  theostones: string; manastones: string[];
  pantheon: { colossus: string; statues: string; paintings: string };
  soulbind: { group: string; slots: { slot: string; priority: string[] }[] }[];
  links: { label: string; url: string }[];
  notes: string[];
};
```

- [ ] **Step 1: Create the fixture from the sheet dump**

Write the Ranger tab of `builds_dump.json` (scratchpad `sheets/`) to `tests/fixtures/ranger-cells.json` as `{ "<cell>": "<text>" }`. Include only non-empty cells, convert the values to strings and trim them:

```bash
python -I -X utf8 -c "import json;d=json.load(open(r'C:/Users/sidot/AppData/Local/Temp/claude/C--Users-sidot-Documents-Github-aiontools/060ce9db-56d1-4318-872d-18a94761e838/scratchpad/sheets/builds_dump.json',encoding='utf-8'));c={x['c']:str(x['v']).strip() for r in d['Ranger']['rows'] for x in r if str(x['v']).strip()};open('tests/fixtures/ranger-cells.json','w',encoding='utf-8',newline='\n').write(json.dumps(c,ensure_ascii=False,indent=1)+'\n')"
```

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/build-parser.test.ts
import { describe, it, expect } from "vitest";
import cells from "../../tests/fixtures/ranger-cells.json";
import { parseClassTab, normName } from "./build-parser";

const b = parseClassTab(cells);

describe("parseClassTab (Ranger)", () => {
  it("reads skills with their priority notes", () => {
    expect(b.skills[0]).toEqual({ name: "Snipe", detail: "(20) - (3/4)" });
    expect(b.skills.find((s) => s.name === "Arrow Scattershot")).toEqual({ name: "Arrow Scattershot", detail: "N/A" });
    expect(b.skills).toHaveLength(12);
  });
  it("reads ranked passives and stigmas, fixing known typos", () => {
    expect(b.passives[0]).toEqual({ name: "Focused Eye", rank: 1 });
    expect(b.stigmas[0]).toEqual({ name: "Vaizel's Authority", rank: 1 });
    expect(b.stigmas.some((s) => s.name === "Explosive Arrow" && s.rank === undefined)).toBe(true);
  });
  it("splits equip effect targets", () => {
    expect(b.equipEffects[0].slice(0, 2)).toEqual(["Snipe", "Tempest Shot"]);
    expect(b.equipEffects.at(-1)).toEqual(["Endurance"]);
  });
  it("reads the five Daevanion boards", () => {
    expect(b.boards.map((x) => x.name)).toEqual(["Cogni", "Natura", "Special", "Fera", "Varian"]);
    expect(b.boards[0].lines[0]).toEqual({ lines: "1 & 5", priority: ["Max Attack", "Attack Bonus"] });
  });
  it("reads gear, titles, theostones, manastones and pantheon", () => {
    expect(b.titles.offensive[0]).toBe("Playing God");
    expect(b.titles.defensive).toContain("Rule All Creation");
    expect(b.manastones.length).toBeGreaterThan(2);
    expect(b.pantheon.colossus).toMatch(/Zikel/);
    expect(b.theostones).toMatch(/Poison/);
  });
  it("groups soul binding by slot", () => {
    expect(b.soulbind.map((g) => g.group)).toEqual(["Weaponary", "Armor", "Passive Accessories"]);
    expect(b.soulbind[0].slots[0].slot).toBe("Weapon");
    expect(b.soulbind[2].slots.map((s) => s.slot)).toContain("Seals");
  });
  it("collects links and notes", () => {
    expect(b.links.some((l) => l.url.startsWith("https://docs.google.com/"))).toBe(true);
    expect(b.notes.some((n) => n.startsWith("Option 1"))).toBe(true);
  });
  it("throws with the cell name when the layout changes", () => {
    expect(() => parseClassTab({ ...cells, A16: "Something else" })).toThrow(/A16/);
  });
  it("normalizes names for matching", () => {
    expect(normName("Vaizel's Authority")).toBe("vaizelsauthority");
  });
});
```

Run: `pnpm test src/lib/build-parser.test.ts`
Expected: FAIL, because the module cannot be found.

- [ ] **Step 3: Implement**

```ts
// src/lib/build-parser.ts
// Parses one class tab of the "Personal Aion 2 Class Info" sheet. Rows 2–44 follow a fixed template
// (checked by label below); rows 45+ hold links, macro notes and screenshots in a free layout.
export type Cells = Record<string, string>;
export type BuildSkill = { name: string; rank?: number; detail?: string };

export const normName = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

// Sheet typos → the names used in game (and by the icon database).
export const SKILL_ALIASES: Record<string, string> = {
  "Focused Eyes": "Focused Eye",
  "Incandensent Blow": "Incandescent Blow",
  "Summon Ressurection": "Summon Resurrection",
  "Assult Stance": "Assault Stance",
  Siphone: "Siphon",
};

const LABELS: Record<string, RegExp> = {
  A2: /^Skills Priority/i, B2: /^Passive Priority/i, C2: /^Stigmas? Priority/i, D2: /^Arcana/i, E2: /^God Stats/i, F2: /^Equip Effects/i,
  A15: /^Genus Insight/i, A16: /^Cogni Board/i, B16: /^Natura Board/i, C16: /^Special Board/i, A22: /^Fera Board/i, B22: /^Varian Board/i,
  E15: /^Wings/i, E16: /^Meta Equipped Wings/i, E17: /^Highest Value Wings/i, E20: /^Enhancing Priority/i,
  E22: /^Offensive Titles?/i, E23: /^Defensive Titles?/i, E24: /^Special Titles?/i, E25: /^Theostones/i,
  E28: /^Manastones/i, E29: /^Stats Priority/i, E32: /^Pantheon/i, E34: /^Colossus/i, E35: /^Statues/i, E36: /^Paintings/i,
  A28: /^Soul ?Binding/i, A29: /^Weaponary/i, A32: /^Armor/i, A39: /^Passive Accessories/i,
};

const get = (c: Cells, k: string) => (c[k] ?? "").trim();
const column = (c: Cells, col: string, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => get(c, `${col}${from + i}`)).filter(Boolean);
const split = (s: string, sep: RegExp) => s.split(sep).map((x) => x.trim()).filter(Boolean);

function parseSkill(raw: string): BuildSkill {
  const ranked = raw.match(/^(\d+)\.\s*(.*)$/);
  const text = ranked ? ranked[2] : raw;
  const m = text.match(/^(.+?)(?:\s+(\(.*|-\s*.*))?$/)!;
  const name = SKILL_ALIASES[m[1].trim()] ?? m[1].trim();
  const detail = m[2]?.replace(/^-\s*/, "").trim();
  return { name, ...(ranked && { rank: Number(ranked[1]) }), ...(detail && { detail }) };
}

const parseTargets = (raw: string) => split(raw.replace(/^Target the follow(?:ing)?:\s*/i, ""), /\(\d+\)/);

function parseBoardLine(raw: string) {
  const m = raw.match(/^Line\s*\(([^)]+)\)\s*:\s*(.*)$/i);
  if (!m) throw new Error(`layout changed: board line "${raw}"`);
  return { lines: m[1].trim(), priority: split(m[2], />/) };
}

export function parseClassTab(c: Cells) {
  for (const [cell, re] of Object.entries(LABELS)) {
    if (!re.test(get(c, cell))) throw new Error(`layout changed: ${cell}="${get(c, cell)}" does not match ${re}`);
  }
  const board = (head: string, col: string, from: number) => ({
    name: get(c, head).replace(/\s*Board$/i, ""),
    lines: column(c, col, from, from + 4).map(parseBoardLine),
  });

  const soulbind: { group: string; slots: { slot: string; priority: string[] }[] }[] = [];
  for (let row = 29; row <= 44; row++) {
    const label = get(c, `A${row}`);
    const value = get(c, `B${row}`);
    if (!label) continue;
    if (!value) soulbind.push({ group: label, slots: [] });
    else soulbind.at(-1)!.slots.push({ slot: label, priority: split(value, />/) });
  }

  // Rows 45+: free layout. Any URL is a link (labelled by column A of its row); other text is a note.
  const links: { label: string; url: string }[] = [];
  const notes: string[] = [];
  const rows = [...new Set(Object.keys(c).map((k) => Number(k.replace(/^[A-Z]+/, ""))))].filter((r) => r >= 45).sort((a, b) => a - b);
  for (const row of rows) {
    const cells = Object.keys(c)
      .filter((k) => Number(k.replace(/^[A-Z]+/, "")) === row)
      .sort();
    for (const k of cells) {
      const text = get(c, k);
      const url = text.match(/https?:\/\/\S+/)?.[0];
      if (url) links.push({ label: get(c, `A${row}`).replace(/:\s*$/, "") || url, url });
      else if (!k.startsWith("A") || !cells.some((x) => /https?:\/\//.test(get(c, x)))) {
        if (!/^(Skill Layout Example|Macro|Credits)/i.test(text)) notes.push(text);
      }
    }
  }

  return {
    skills: column(c, "A", 3, 14).map(parseSkill),
    passives: column(c, "B", 3, 14).map(parseSkill),
    stigmas: column(c, "C", 3, 14).map(parseSkill),
    arcana: column(c, "D", 3, 14),
    godStats: column(c, "E", 3, 14),
    equipEffects: column(c, "F", 3, 14).map(parseTargets),
    boards: [board("A16", "A", 17), board("B16", "B", 17), board("C16", "C", 17), board("A22", "A", 23), board("B22", "B", 23)],
    wings: { meta: get(c, "F16"), leveling: get(c, "F17") },
    enhancing: split(get(c, "F20"), />/),
    titles: { offensive: split(get(c, "F22"), /[>/]/), defensive: split(get(c, "F23"), /[>/]/), special: split(get(c, "F24"), /[>/]/) },
    theostones: get(c, "F26"),
    manastones: split(get(c, "F29"), />/),
    pantheon: { colossus: get(c, "F34"), statues: get(c, "F35"), paintings: get(c, "F36") },
    soulbind,
    links,
    notes,
  };
}
export type ParsedBuild = ReturnType<typeof parseClassTab>;
```

Run: `pnpm test src/lib/build-parser.test.ts`
Expected: PASS.

If a Ranger assertion fails because the real sheet differs from the dump excerpt above, fix the parser and never the expectation. The one exception is when the dump proves the expectation itself is wrong; then write a ledger ruling.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add class build sheet parser

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Import script, build content and icon resolution

**Files:**
- Create: `scripts/import-builds.mts`, `src/lib/builds.ts`
- Generated: `content/builds/<classId>.json` (8 files) and `public/builds/<classId>/shot-N.<ext>`
- Test: `src/lib/builds.test.ts`

**Interfaces:**
- Consumes: `parseClassTab`, `normName` and `content/icons.json`
- Produces:
  - `ClassBuildSchema`, which is `ParsedBuild` plus `id`, `name` and `screenshots: string[]`
  - `BUILDS: Record<ClassId, ClassBuild>` and `BUILD_IDS`
  - `iconFor(classId, skillName): string | undefined`, `classIcon(classId): string` and `KNOWN_MISSING_ICONS`

- [ ] **Step 1: Write the import script**

```ts
// scripts/import-builds.mts
// Re-runnable: sheet class tabs → content/builds/<classId>.json and public/builds/<classId>/shot-N.<ext>.
// Run with `node scripts/import-builds.mts`. Fails without writing if any tab's layout changed.
import ExcelJS from "exceljs";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { parseClassTab, type Cells } from "../src/lib/build-parser.ts";

const SHEET = "1lbHaVairHaz26M8XGNF9CBWqiiHHBM6CylTwNKnlOug";
const TABS: Record<string, { tab: string; name: string }> = {
  chanter: { tab: "Chanter", name: "Chanter" },
  ranger: { tab: "Ranger", name: "Ranger" },
  cleric: { tab: "Cleric", name: "Cleric" },
  "spirit-master": { tab: "Spirit Master", name: "Spirit Master" },
  gladiator: { tab: "Gladiator", name: "Gladiator" },
  sorcerer: { tab: "Sorcerer", name: "Sorcerer" },
  templar: { tab: "Templar", name: "Templar" },
  assassin: { tab: "Assassin", name: "Assassin" },
};

const res = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET}/export?format=xlsx`);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const wb = new ExcelJS.Workbook();
// exceljs types predate the generic Node Buffer.
await wb.xlsx.load(Buffer.from(await res.arrayBuffer()) as unknown as Parameters<typeof wb.xlsx.load>[0]);

const outputs: [string, string][] = [];
const images: [string, ExcelJS.Image][] = [];
for (const [id, { tab, name }] of Object.entries(TABS)) {
  const ws = wb.getWorksheet(tab);
  if (!ws) throw new Error(`missing tab: ${tab}`);
  const cells: Cells = {};
  ws.eachRow((row) => row.eachCell((cell) => {
    const text = cell.text.trim();
    if (text) cells[cell.address] = text;
  }));
  const parsed = parseClassTab(cells); // throws on layout changes, before anything is written
  const shots = ws
    .getImages()
    .map((img) => ({ row: img.range.tl.nativeRow, col: img.range.tl.nativeCol, media: wb.getImage(Number(img.imageId)) }))
    .sort((a, b) => a.row - b.row || a.col - b.col);
  const screenshots = shots.map((s, i) => `/builds/${id}/shot-${i + 1}.${s.media.extension}`);
  shots.forEach((s, i) => images.push([`public${screenshots[i]}`, s.media]));
  outputs.push([`content/builds/${id}.json`, JSON.stringify({ id, name, ...parsed, screenshots }, null, 2) + "\n"]);
}

mkdirSync("content/builds", { recursive: true });
for (const [path, json] of outputs) writeFileSync(path, json);
rmSync("public/builds", { recursive: true, force: true });
for (const [path, media] of images) {
  mkdirSync(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  writeFileSync(path, Buffer.from(media.buffer!));
}
console.log(`wrote ${outputs.length} builds and ${images.length} screenshots`);
```

The script imports `../src/lib/build-parser.ts` directly, which Node's type stripping allows. If `tsc` complains about the `.ts` extension in the import, add `"allowImportingTsExtensions": true` to `tsconfig.json`. It is safe because of `noEmit`.

- [ ] **Step 2: Run it twice and check that it is idempotent**

Run: `node scripts/import-builds.mts`
Expected: `wrote 8 builds and N screenshots`, with no exception.

Run it a second time, then run: `git status --short content/builds`
Expected: the second run produces no extra changes. Everything should show as untracked or new, and nothing should flip between the two runs.

Every class must parse. If one class throws `layout changed`, look at that tab in the dump. If the difference is legitimate (for example "Soul Binding" written with a space), widen that label's regex and record a ledger ruling.

- [ ] **Step 3: Write the failing test**

```ts
// src/lib/builds.test.ts
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { BUILDS, BUILD_IDS, iconFor, classIcon, KNOWN_MISSING_ICONS } from "./builds";
import { CLASSES } from "./classes";

describe("builds content", () => {
  it("has a build for every class", () => {
    expect([...BUILD_IDS].sort()).toEqual(CLASSES.map((c) => c.id).sort());
  });
  it("every skill, passive and stigma resolves to an icon or is a known gap", () => {
    const unresolved = BUILD_IDS.flatMap((id) =>
      [...BUILDS[id].skills, ...BUILDS[id].passives, ...BUILDS[id].stigmas]
        .filter((s) => !iconFor(id, s.name) && !KNOWN_MISSING_ICONS.has(`${id}:${s.name}`))
        .map((s) => `${id}:${s.name}`),
    );
    expect(unresolved).toEqual([]);
  });
  it("only references files that exist", () => {
    for (const id of BUILD_IDS) {
      expect(existsSync(join("public", classIcon(id))), id).toBe(true);
      for (const s of BUILDS[id].screenshots) expect(existsSync(join("public", s)), s).toBe(true);
      for (const s of [...BUILDS[id].skills, ...BUILDS[id].passives, ...BUILDS[id].stigmas]) {
        const icon = iconFor(id, s.name);
        if (icon) expect(existsSync(join("public", icon)), icon).toBe(true);
      }
    }
  });
  it("every class has its five boards and three soul binding groups", () => {
    for (const id of BUILD_IDS) {
      expect(BUILDS[id].boards).toHaveLength(5);
      expect(BUILDS[id].soulbind).toHaveLength(3);
    }
  });
});
```

Run: `pnpm test src/lib/builds.test.ts`
Expected: FAIL, because `./builds` cannot be found.

- [ ] **Step 4: Implement `src/lib/builds.ts`**

```ts
// src/lib/builds.ts
import { z } from "zod";
import icons from "@content/icons.json";
import chanter from "@content/builds/chanter.json";
import ranger from "@content/builds/ranger.json";
import cleric from "@content/builds/cleric.json";
import spiritMaster from "@content/builds/spirit-master.json";
import gladiator from "@content/builds/gladiator.json";
import sorcerer from "@content/builds/sorcerer.json";
import templar from "@content/builds/templar.json";
import assassin from "@content/builds/assassin.json";
import { normName } from "./build-parser";

const Skill = z.object({ name: z.string().min(1), rank: z.number().int().positive().optional(), detail: z.string().optional() });
const Url = z.url().refine((u) => /^https?:\/\//.test(u), "http(s) only");

export const ClassBuildSchema = z.object({
  id: z.string().regex(/^[a-z-]+$/),
  name: z.string().min(1),
  skills: z.array(Skill).min(1),
  passives: z.array(Skill),
  stigmas: z.array(Skill).min(1),
  arcana: z.array(z.string()),
  godStats: z.array(z.string()),
  equipEffects: z.array(z.array(z.string())),
  boards: z.array(z.object({ name: z.string(), lines: z.array(z.object({ lines: z.string(), priority: z.array(z.string()) })) })).length(5),
  wings: z.object({ meta: z.string(), leveling: z.string() }),
  enhancing: z.array(z.string()),
  titles: z.object({ offensive: z.array(z.string()), defensive: z.array(z.string()), special: z.array(z.string()) }),
  theostones: z.string(),
  manastones: z.array(z.string()),
  pantheon: z.object({ colossus: z.string(), statues: z.string(), paintings: z.string() }),
  soulbind: z.array(z.object({ group: z.string(), slots: z.array(z.object({ slot: z.string(), priority: z.array(z.string()) })) })),
  links: z.array(z.object({ label: z.string(), url: Url })),
  notes: z.array(z.string()),
  screenshots: z.array(z.string().regex(/^\/builds\/[a-z-]+\/shot-\d+\.(png|jpe?g|gif|webp)$/)),
});
export type ClassBuild = z.infer<typeof ClassBuildSchema>;

const RAW = { chanter, ranger, cleric, "spirit-master": spiritMaster, gladiator, sorcerer, templar, assassin };
export const BUILDS: Record<string, ClassBuild> = Object.fromEntries(
  Object.entries(RAW).map(([id, raw]) => [id, ClassBuildSchema.parse(raw)]),
);
export const BUILD_IDS = Object.keys(BUILDS);

const ICONS = icons as { classes: Record<string, string>; skills: Record<string, Record<string, string>> };
export const iconFor = (classId: string, name: string): string | undefined => ICONS.skills[classId]?.[normName(name)];
export const classIcon = (classId: string): string => ICONS.classes[classId];

// Skills named in the sheet that questlog's database does not list (yet). Each entry needs a reason.
export const KNOWN_MISSING_ICONS = new Set<string>([]);
```

Run: `pnpm test src/lib/builds.test.ts`
Expected: the first, third and fourth tests pass. The icon test may list unresolved names.

For each unresolved `<classId>:<name>`, search the questlog list for that class in `content/icons.json` (`skills.<classId>`).
- If it is a sheet typo, add it to `SKILL_ALIASES` in `build-parser.ts`, re-run `node scripts/import-builds.mts`, and add a test line to `build-parser.test.ts` that pins that alias.
- If the skill really is absent from questlog, add `"<classId>:<name>"` to `KNOWN_MISSING_ICONS` with a `// reason` comment on the line.

Repeat until the test passes. Record every alias and known gap in the ledger.

- [ ] **Step 5: Verify and commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: every test passes, and the typecheck and lint runs are clean.

```bash
git add -A
git commit -m "feat: import class builds from the sheet with icons and screenshots

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Italian phrase glossary

**Files:**
- Create: `content/builds/it.json`
- Modify: `src/lib/builds.ts` (add `buildText` and `BUILD_PHRASES`)
- Test: `src/lib/builds-i18n.test.ts`

**Interfaces:**
- Produces:
  - `BUILD_PHRASES: string[]`, every free-text sentence that needs translating: theostones, the three pantheon notes and all `notes`, across all builds, de-duplicated
  - `buildText(text: string, locale: string): string`, which returns the Italian from the glossary when `locale === "it"` and an entry exists, otherwise the original text

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/builds-i18n.test.ts
import { describe, it, expect } from "vitest";
import glossary from "@content/builds/it.json";
import { BUILD_PHRASES, buildText } from "./builds";

describe("build phrase glossary", () => {
  it("translates every free-text phrase of every build", () => {
    const missing = BUILD_PHRASES.filter((p) => !(glossary as Record<string, string>)[p]);
    expect(missing).toEqual([]);
  });
  it("falls back to English for unknown text and for en", () => {
    expect(buildText("Some new sentence", "it")).toBe("Some new sentence");
    expect(buildText(BUILD_PHRASES[0], "en")).toBe(BUILD_PHRASES[0]);
    expect(buildText(BUILD_PHRASES[0], "it")).not.toBe("");
  });
  it("has no stale entries", () => {
    expect(Object.keys(glossary).filter((k) => !BUILD_PHRASES.includes(k))).toEqual([]);
  });
});
```

Run: `pnpm test src/lib/builds-i18n.test.ts`
Expected: FAIL, because `content/builds/it.json` and the exports are missing.

- [ ] **Step 2: Add `BUILD_PHRASES` and `buildText` to `src/lib/builds.ts`**

```ts
import glossary from "@content/builds/it.json";

const GLOSSARY = glossary as Record<string, string>;

export const BUILD_PHRASES: string[] = [
  ...new Set(
    BUILD_IDS.flatMap((id) => {
      const b = BUILDS[id];
      return [b.theostones, b.pantheon.colossus, b.pantheon.statues, b.pantheon.paintings, ...b.notes].filter(Boolean);
    }),
  ),
].sort();

// Sheet sentences are translated by exact English text, so a re-import keeps unchanged translations.
export function buildText(text: string, locale: string): string {
  return (locale === "it" && GLOSSARY[text]) || text;
}
```

- [ ] **Step 3: Write `content/builds/it.json`**

Create the file as `{}` first. Then print the phrases that need translating:

```bash
node -e "import('./src/lib/builds.ts').catch(()=>{})" 2>/dev/null; pnpm vitest run src/lib/builds-i18n.test.ts 2>&1 | head -80
```

The failing "missing" list shows every phrase. Write each one as `"<exact English>": "<Italian>"`, following plan 4's Translation rules: game names stay in English, use the informal "tu", and write numbers the Italian way. Keys must be the exact English text, character for character. Sort the keys alphabetically so the diff stays stable.

Run: `pnpm test src/lib/builds-i18n.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: translate build notes through a phrase glossary

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Builds pages and navigation

**Files:**
- Modify: `messages/en.json`, `messages/it.json`, `src/components/shell/nav-items.ts`, `src/components/shell/bottom-nav.tsx`, `src/components/home/home-dashboard.tsx`
- Create:
  - `src/components/builds/skill-chip.tsx`, `src/components/builds/build-section.tsx`
  - `src/app/[locale]/builds/page.tsx`, `src/app/[locale]/builds/[classId]/page.tsx`

**Interfaces:**
- Consumes: `BUILDS`, `BUILD_IDS`, `iconFor`, `classIcon`, `buildText` and `className`
- Produces:
  - the routes `/builds` and `/builds/<classId>`, where `generateStaticParams` returns every pair of locale and class
  - the section anchors `#skills`, `#stigmas`, `#arcana`, `#boards`, `#soulbind`, `#gear`, `#media` and `#links`

- [ ] **Step 1: Add the messages**

Add `"builds": "Builds"` to `"nav"` in both message files. Add `"classes": "Classes"` to `"palette.groups"` in EN and `"classes": "Classi"` in IT.

Add a top-level key to `messages/en.json`:

```json
  "builds": {
    "title": "Builds",
    "intro": "Recommended builds for every class, from Castform's spreadsheet.",
    "back": "All classes",
    "nav": { "skills": "Skills", "stigmas": "Stigmas & passives", "arcana": "Arcana & stats", "boards": "Daevanion", "soulbind": "Soul binding", "gear": "Gear & more", "media": "Screenshots", "links": "Links" },
    "skills": "Skill priority",
    "skillsHint": "(20) means: prioritize while leveling. The numbers after the dash are the recommended specializations.",
    "passives": "Passive priority",
    "stigmas": "Stigma priority",
    "stigmaAlternatives": "Alternatives",
    "arcana": "Arcana sets",
    "godStats": "God stats on the arcana",
    "equipEffects": "Equip effects to target",
    "equipEffectsHint": "Examples: the options won't always be exactly the same.",
    "boards": "Daevanion board priorities",
    "board": "{name} board",
    "line": "Line {lines}",
    "soulbind": "Soul binding priorities",
    "wings": "Wings",
    "wingsMeta": "Meta equipped",
    "wingsLeveling": "Best to level up",
    "enhancing": "Enhancing priority",
    "titles": "Titles",
    "titlesOffensive": "Offensive",
    "titlesDefensive": "Defensive",
    "titlesSpecial": "Special",
    "theostones": "Theostones",
    "manastones": "Manastone stat priority",
    "pantheon": "Pantheon",
    "colossus": "Colossus",
    "statues": "Statues",
    "paintings": "Paintings",
    "media": "Screenshots",
    "notes": "Notes",
    "links": "Links",
    "openImage": "Open screenshot {n} full size"
  }
```

Add the matching key to `messages/it.json`:

```json
  "builds": {
    "title": "Build",
    "intro": "Build consigliate per ogni classe, dal foglio di Castform.",
    "back": "Tutte le classi",
    "nav": { "skills": "Skill", "stigmas": "Stigma e passive", "arcana": "Arcana e statistiche", "boards": "Daevanion", "soulbind": "Soul binding", "gear": "Equip e altro", "media": "Screenshot", "links": "Link" },
    "skills": "Priorità delle skill",
    "skillsHint": "(20) significa: da prioritizzare mentre sali di livello. I numeri dopo il trattino sono le specializzazioni consigliate.",
    "passives": "Priorità delle passive",
    "stigmas": "Priorità delle stigma",
    "stigmaAlternatives": "Alternative",
    "arcana": "Set di Arcana",
    "godStats": "God stat sulle Arcana",
    "equipEffects": "Equip effect da cercare",
    "equipEffectsHint": "Esempi: le opzioni non saranno sempre identiche.",
    "boards": "Priorità del Daevanion board",
    "board": "Board {name}",
    "line": "Linea {lines}",
    "soulbind": "Priorità del soul binding",
    "wings": "Ali",
    "wingsMeta": "Meta da equipaggiare",
    "wingsLeveling": "Migliori da potenziare",
    "enhancing": "Priorità di potenziamento",
    "titles": "Titoli",
    "titlesOffensive": "Offensivi",
    "titlesDefensive": "Difensivi",
    "titlesSpecial": "Speciali",
    "theostones": "Theostone",
    "manastones": "Priorità delle statistiche delle Manastone",
    "pantheon": "Pantheon",
    "colossus": "Colossus",
    "statues": "Statue",
    "paintings": "Dipinti",
    "media": "Screenshot",
    "notes": "Note",
    "links": "Link",
    "openImage": "Apri lo screenshot {n} a dimensione intera"
  }
```

Run: `pnpm test tests/i18n-keys.test.ts`
Expected: PASS.

- [ ] **Step 2: Add Builds to the navigation**

In `src/components/shell/nav-items.ts`, import `Swords` from `lucide-react` and insert `{ href: "/builds", key: "builds", icon: Swords },` after the checklist entry. In `bottom-nav.tsx`, change `grid-cols-5` to `grid-cols-6` and the label class `text-xs` to `text-[11px]`, so six labels fit at 375 px.

In `src/components/home/home-dashboard.tsx`, replace `<span className="text-xs text-muted-foreground">{className(c.classId)}</span>` with:

```tsx
<Link href={`/builds/${c.classId}`} className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline">{className(c.classId)}</Link>
```

`Link` is already imported from `@/i18n/navigation`.

- [ ] **Step 3: Create the components**

```tsx
// src/components/builds/skill-chip.tsx
import { iconFor } from "@/lib/builds";

export function SkillChip({ classId, name, rank, detail }: { classId: string; name: string; rank?: number; detail?: string }) {
  const icon = iconFor(classId, name);
  return (
    <span className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background/40 py-1 pr-3 pl-1">
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element -- fixed 64px game icons
        <img src={icon} alt="" width={36} height={36} className="size-9 rounded-md" loading="lazy" />
      ) : (
        <span className="size-2" aria-hidden />
      )}
      {rank !== undefined && <span className="font-mono text-xs text-primary">{rank}</span>}
      <span className="text-sm">{name}</span>
      {detail && <span className="font-mono text-xs text-muted-foreground">{detail}</span>}
    </span>
  );
}
```

```tsx
// src/components/builds/build-section.tsx
export function BuildSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-32 space-y-3 rounded-xl border border-border bg-card p-4">
      <h2 id={`${id}-title`} className="font-display text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function Priority({ items }: { items: string[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
      {items.map((x, i) => (
        <li key={`${i}-${x}`} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-muted-foreground" aria-hidden>›</span>}
          <span>{x}</span>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 4: Create the pages**

```tsx
// src/app/[locale]/builds/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BUILD_IDS, BUILDS, classIcon } from "@/lib/builds";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "builds" });
  return { title: t("title") };
}

export default async function BuildsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("builds");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </header>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {BUILD_IDS.map((id) => (
          <li key={id}>
            <Link href={`/builds/${id}`} className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/60">
              {/* eslint-disable-next-line @next/next/no-img-element -- small class emblems */}
              <img src={classIcon(id)} alt="" width={72} height={72} className="size-18" />
              <span className="font-display text-lg font-semibold">{BUILDS[id].name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/app/[locale]/builds/[classId]/page.tsx
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { BUILD_IDS, BUILDS, buildText, classIcon } from "@/lib/builds";
import { SkillChip } from "@/components/builds/skill-chip";
import { BuildSection, Priority } from "@/components/builds/build-section";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => BUILD_IDS.map((classId) => ({ locale, classId })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; classId: string }> }) {
  const { classId } = await params;
  return { title: BUILDS[classId]?.name ?? "Build" };
}

const SECTIONS = ["skills", "stigmas", "arcana", "boards", "soulbind", "gear", "media", "links"] as const;

export default async function BuildPage({ params }: { params: Promise<{ locale: string; classId: string }> }) {
  const { locale, classId } = await params;
  const b = BUILDS[classId];
  if (!b) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("builds");
  const T = (s: string) => buildText(s, locale);
  const chips = (list: typeof b.skills) => (
    <div className="flex flex-wrap gap-2">{list.map((s) => <SkillChip key={`${s.rank}-${s.name}`} classId={classId} {...s} />)}</div>
  );
  const ranked = b.stigmas.filter((s) => s.rank !== undefined);
  const alternatives = b.stigmas.filter((s) => s.rank === undefined);
  const dl = (rows: [string, React.ReactNode][]) => (
    <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[12rem_1fr]">
      {rows.filter(([, v]) => v).map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="sticky top-14 z-20 -mx-4 space-y-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:top-16 md:-mx-8 md:px-8">
        <Link href="/builds" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          {t("back")}
        </Link>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- small class emblem */}
          <img src={classIcon(classId)} alt="" width={48} height={48} className="size-12" />
          <h1 className="font-display text-3xl font-bold">{b.name}</h1>
        </div>
        <nav aria-label={t("title")} className="-mx-1 flex gap-1 overflow-x-auto">
          {SECTIONS.map((s) => (
            <a key={s} href={`#${s}`} className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
              {t(`nav.${s}`)}
            </a>
          ))}
        </nav>
      </header>

      <BuildSection id="skills" title={t("skills")}>
        <p className="text-xs text-muted-foreground">{t("skillsHint")}</p>
        {chips(b.skills)}
      </BuildSection>

      <BuildSection id="stigmas" title={t("nav.stigmas")}>
        <h3 className="text-sm font-medium">{t("stigmas")}</h3>
        {chips(ranked)}
        {alternatives.length > 0 && (
          <>
            <h3 className="text-sm font-medium">{t("stigmaAlternatives")}</h3>
            {chips(alternatives)}
          </>
        )}
        {b.passives.length > 0 && (
          <>
            <h3 className="text-sm font-medium">{t("passives")}</h3>
            {chips(b.passives)}
          </>
        )}
      </BuildSection>

      <BuildSection id="arcana" title={t("nav.arcana")}>
        {dl([
          [t("arcana"), <Priority key="a" items={b.arcana} />],
          [t("godStats"), <Priority key="g" items={b.godStats} />],
        ])}
        <h3 className="text-sm font-medium">{t("equipEffects")}</h3>
        <p className="text-xs text-muted-foreground">{t("equipEffectsHint")}</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm">{b.equipEffects.map((e, i) => <li key={i}><Priority items={e} /></li>)}</ol>
      </BuildSection>

      <BuildSection id="boards" title={t("boards")}>
        <div className="grid gap-4 md:grid-cols-2">
          {b.boards.map((board) => (
            <div key={board.name} className="space-y-1.5">
              <h3 className="text-sm font-medium">{t("board", { name: board.name })}</h3>
              <ul className="space-y-1 text-sm">
                {board.lines.map((l) => (
                  <li key={l.lines} className="flex flex-wrap gap-x-2">
                    <span className="shrink-0 font-mono text-xs text-primary">{t("line", { lines: l.lines })}</span>
                    <Priority items={l.priority} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </BuildSection>

      <BuildSection id="soulbind" title={t("soulbind")}>
        {b.soulbind.map((g) => (
          <div key={g.group} className="space-y-1.5">
            <h3 className="text-sm font-medium">{g.group}</h3>
            {dl(g.slots.map((s) => [s.slot, <Priority key={s.slot} items={s.priority} />]))}
          </div>
        ))}
      </BuildSection>

      <BuildSection id="gear" title={t("nav.gear")}>
        {dl([
          [t("wingsMeta"), b.wings.meta],
          [t("wingsLeveling"), b.wings.leveling],
          [t("enhancing"), <Priority key="e" items={b.enhancing} />],
          [t("titlesOffensive"), <Priority key="o" items={b.titles.offensive} />],
          [t("titlesDefensive"), b.titles.defensive.join(" / ")],
          [t("titlesSpecial"), <Priority key="s" items={b.titles.special} />],
          [t("theostones"), T(b.theostones)],
          [t("manastones"), <Priority key="m" items={b.manastones} />],
          [t("colossus"), T(b.pantheon.colossus)],
          [t("statues"), T(b.pantheon.statues)],
          [t("paintings"), T(b.pantheon.paintings)],
        ])}
      </BuildSection>

      {(b.screenshots.length > 0 || b.notes.length > 0) && (
        <BuildSection id="media" title={t("media")}>
          {b.notes.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm">{b.notes.map((n) => <li key={n} className="whitespace-pre-line">{T(n)}</li>)}</ul>}
          <div className="grid gap-3 sm:grid-cols-2">
            {b.screenshots.map((src, i) => (
              <a key={src} href={src} target="_blank" rel="noreferrer" aria-label={t("openImage", { n: i + 1 })}>
                {/* eslint-disable-next-line @next/next/no-img-element -- screenshots of unknown size */}
                <img src={src} alt="" loading="lazy" className="w-full rounded-lg border border-border" />
              </a>
            ))}
          </div>
        </BuildSection>
      )}

      {b.links.length > 0 && (
        <BuildSection id="links" title={t("links")}>
          <ul className="space-y-1">
            {b.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-primary underline underline-offset-2">
                  {l.label}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </BuildSection>
      )}
    </div>
  );
}
```

For unknown class ids, the route must answer 404 rather than render. If `generateStaticParams` with `cacheComponents` blocks dynamic params at build time, add `export const dynamicParams = false;`. That makes unknown slugs a 404, and the e2e test in Task 6 checks it.

- [ ] **Step 5: Verify**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: every command exits 0, and the build lists `/en/builds/<8 classes>` and `/it/builds/<8 classes>`.

Then check in `pnpm dev`:
- `/it/builds` shows 8 class cards with icons.
- On `/it/builds/ranger`, skill chips show icons and the sticky section nav scrolls to each section.
- The board lines, the soul binding table and the theostones/pantheon text are in Italian.
- Screenshots open full size.
- The class name on a Home character card links to its build.
- The bottom nav has 6 items at 375 px without overflow.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add class builds pages and navigation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Classes in the palette, end-to-end tests and README

**Files:**
- Modify: `src/lib/search.ts`, `src/lib/search.test.ts`, `src/components/command-palette.tsx`, `README.md`
- Create: `e2e/builds.spec.ts`

- [ ] **Step 1: Write the failing search test**

Append to `src/lib/search.test.ts`, inside the `describe`:

```ts
  it("includes every class build", () => {
    const classes = items.filter((i) => i.group === "classes");
    expect(classes.map((c) => c.href)).toContain("/builds/spirit-master");
    expect(classes).toHaveLength(8);
  });
```

Also add `"/builds"` after `"/checklist"` in the expected page `href` list of the "includes every page" test.

Run: `pnpm test src/lib/search.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement**

In `src/lib/search.ts`:
- Add `"classes"` to the `group` union.
- After the checklist page entry, add `page("builds", "/builds", labels.nav("builds")),`.
- Add the class entries, then return `[...pages, ...classes, ...activities, ...roadmap]`:

```ts
  const classes = CLASSES.map((c): SearchItem => ({ id: `class:${c.id}`, group: "classes", label: c.name, href: `/builds/${c.id}`, keywords: "build" }));
```

Import `CLASSES` from `./classes`.

In `src/components/command-palette.tsx`, change `GROUPS` to `["pages", "classes", "activities", "roadmap"]`.

Run: `pnpm test src/lib/search.test.ts`
Expected: PASS.

- [ ] **Step 3: Write the e2e spec**

```ts
// e2e/builds.spec.ts
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("dialog", { name: "Welcome to AionTools" }).getByRole("button", { name: "Skip" }).click();
});

test("class grid leads to a build with skill icons", async ({ page }) => {
  await page.goto("/en/builds");
  await page.getByRole("link", { name: "Ranger" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ranger" })).toBeVisible();
  await expect(page.locator("#skills img").first()).toBeVisible();
  await page.getByRole("link", { name: "Soul binding" }).click();
  await expect(page).toHaveURL(/#soulbind$/);
});

test("unknown class is a 404", async ({ page }) => {
  const res = await page.goto("/en/builds/not-a-class");
  expect(res?.status()).toBe(404);
});
```

Run: `pnpm e2e`
Expected: 9 passed.

- [ ] **Step 4: Update the README**

Add "class builds" to the opening feature list. In `## Content`, add:

```markdown
Class builds come from Castform's spreadsheet via `node scripts/import-builds.mts` (re-runnable; fails if the sheet layout changes). Italian for their free-text notes lives in `content/builds/it.json`, keyed by the English sentence. Skill icons come from questlog.gg's database and class icons from DaevaOS, via `node scripts/import-skill-icons.mts`.
```

- [ ] **Step 5: Run everything and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e`
Expected: every command exits 0.

```bash
git add -A
git commit -m "test: add e2e coverage for builds and classes in the palette

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
