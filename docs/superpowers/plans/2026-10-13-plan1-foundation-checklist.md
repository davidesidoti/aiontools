# AionTools Plan 1 — Foundation + Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a deployable Next.js app containing the i18n shell (IT/EN), the dark/gold theme, a versioned local user state, automatic daily and weekly resets, a daily/weekly/recharge checklist for a main and up to 8 alts, settings and onboarding, and a home dashboard.

**Architecture:**
- Pure domain logic lives in `src/lib/`: reset math, checklist and character operations, and schema/parsing. All of it is unit-tested and takes `now` as an argument.
- A small Zustand store holds `UserData`. It persists to localStorage by hand, so corrupt data can be backed up rather than dropped.
- The pages are App Router routes under `/[locale]`, built with next-intl and shadcn/ui.
- Static content lives in `content/*.json` and is validated with Zod when the module loads, so bad content fails the build.

**Tech Stack:** Next.js (latest, App Router, TypeScript, `src/` dir), Tailwind CSS v4, shadcn/ui, next-intl v4, Zustand v5, Zod v4, lucide-react, sonner, Vitest + Testing Library + jsdom, Playwright, pnpm, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-13-aiontools-design.md`

This is plan 1 of 4. The others are: plan 2, sync (API, Upstash, conflict UI); plan 3, class builds (import, icons, pages); plan 4, crafting, guides, the Content Guide import and the Ctrl+K palette.

### Deliberate deviations from the spec

| Spec | Plan 1 | Why |
|---|---|---|
| Activities are produced by the import script | `content/activities.json` is hand-curated | The sheet's count strings are free text (`0-3x/War`, `20x/Week (Main) 4x/Week Alt`) and need a human's judgment. Plan 4 adds the Content Guide import, which supplies the text fields. |
| `Activity` has the full set of fields | Plan 1 uses a subset: `id`, `name`, `section`, `scope`, `limit` (`limit` gains `altMax`), and `note` | Plan 4 extends the schema. |
| `@date-fns/tz` for reset math | Pure arithmetic with fixed UTC offsets | Global is UTC, KR is UTC+9 and TW is UTC+8, and none of them observe DST. |
| `settings` holds `region`, `theme` and `accent` | Plan 1 adds `onboarded: boolean` | The first-visit onboarding needs a flag. |
| Ctrl+K command palette | Moved to plan 4 | In plan 1 it would only search two pages. |

## Global Constraints

- Node 24 or newer, with pnpm. If pnpm is missing, enable it with `corepack enable pnpm`, or fall back to `npm i -g pnpm`.
- The locales are exactly `en` and `it`, and the default is `en`. Every route lives under `/[locale]`.
- Game names (activities, classes, skills) stay in English in both locales. Notes and UI strings are translated.
- Reset rules:

  | Region | Daily reset | Weekly reset |
  |---|---|---|
  | `global` | 07:00 UTC | Wednesday 07:00 UTC |
  | `kr` | 05:00 UTC+9 | Wednesday |
  | `tw` | 05:00 UTC+8 | Wednesday |

- Recharge activities reset daily in v1.
- Characters: at most 9 (1 main and up to 8 alts). Exactly one main whenever the list is non-empty. A name is 1 to 32 characters after trimming.
- localStorage key: `aiontools:user-data`. A corrupt value is copied to `aiontools-backup-{epochMs}` before the app falls back to defaults.
- An imported JSON file must be at most 65,536 characters and is validated against `UserDataSchema`.
- `updatedAt` is bumped only by user edits, never by automatic resets. Plan 2's sync depends on this.
- Accessibility: every control is reachable by keyboard and has an accessible name. Counters use the label `"{activity}, {character}: {count} of {max}"`. Touch targets are at least 44 px (`min-h-11 min-w-11`).
- Colors and theme: dark is the default. Backgrounds are ink-blue and the primary is gold. With `data-accent="asmodian"` the primary becomes violet.
- Git: if `git config user.name` is empty, commit with `git -c user.name="Davide Sidoti" -c user.email="sidotidavide@gmail.com" commit ...`. Never change the global config. Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Links styled as buttons: always use `<Link className={buttonVariants({ variant, size })}>` with `buttonVariants` imported from `@/components/ui/button`. Never use `<Button asChild>`, because newer shadcn versions built on Base UI drop `asChild`. The same applies to Radix-specific data attributes: if the installed shadcn primitives are Base UI, map `data-[state=closed]` to the equivalent attribute.
- Docs: Next.js and next-intl move fast. If a command or API in this plan errors, check the installed version's docs and adapt the call without changing its behavior. Next.js docs are in `node_modules/next/dist/docs/` when present, otherwise at nextjs.org/docs. next-intl docs are at next-intl.dev.

## Review Focus

These are the failure modes most likely to hurt a real user. Each line names the test that pins it down.

1. **The app is opened weeks after the last visit, or exactly at the reset instant.** Daily and weekly counters reset exactly once, and a reset at `07:00:00.000` counts as already happened. Tests: Task 2 (boundary equality) and Task 5 (`applyResets` across 3 weeks, and calling it twice is idempotent).
2. **localStorage is corrupt, from an older schema, or unavailable** (for example in a private window). The app still loads and keeps a backup of the raw value. Tests: Task 4 (`parseStored` with garbage or a bad version), Task 6 (backup written; a throwing localStorage does not crash), and Task 12 (E2E with corrupt storage).
3. **A main-only activity on an alt.** It cannot be ticked, and it renders as disabled. When the main changes, a stored count above the new maximum is clamped on display. Tests: Task 5 (`setCount` on an alt returns the same object; `getCount` clamps) and Task 9 (the cell renders as disabled).
4. **The main character is removed.** The next character becomes main and the removed character's progress is deleted. A character list with no main is never stored. Test: Task 5.
5. **The user imports an invalid, oversized, or foreign JSON file.** It is rejected with a message and the existing data is untouched. Test: Task 4 (`parseImported`: oversized, wrong shape, invalid JSON).

---

## File Map

```
content/activities.json                  hand-curated checklist activities
messages/en.json, messages/it.json       UI strings
src/lib/regions.ts                       region reset rules
src/lib/reset.ts                         lastResetAt / nextResetAt
src/lib/activities.ts                    Activity schema, ACTIVITIES, maxFor, resetPeriod, localize
src/lib/classes.ts                       CLASSES list (8 classes)
src/lib/user-data.ts                     UserDataSchema, createDefaultUserData, migrate, parseStored, parseImported, setSettings
src/lib/checklist.ts                     applyResets, getCount, setCount, progressFor
src/lib/characters.ts                    addCharacter, removeCharacter, setMain, updateCharacter
src/lib/format.ts                        formatCountdown
src/store/user-store.ts                  Zustand store with manual persistence
src/hooks/use-now.ts                     ticking Date (null until mounted)
src/i18n/routing.ts, navigation.ts, request.ts
src/proxy.ts (Next ≥16) or src/middleware.ts (Next ≤15)
src/app/[locale]/layout.tsx, page.tsx, checklist/page.tsx, settings/page.tsx
src/components/store-hydrator.tsx        hydrate, reset ticker, theme applier, corrupt toast
src/components/shell/*                   app-shell, sidebar, bottom-nav, top-bar, nav-items, locale-switch, theme-toggle, reset-countdown, footer
src/components/checklist/*               checklist-view, checklist-cell, progress-ring
src/components/settings/*                region-select, characters-editor, appearance-settings, data-transfer
src/components/onboarding-dialog.tsx
src/components/home/home-dashboard.tsx
tests are colocated as *.test.ts(x); e2e/ holds Playwright specs
```

---

### Task 1: Scaffold, tooling, CI

**Files:**
- Create: the Next.js scaffold, `vitest.config.mts`, `vitest.setup.ts`, `src/lib/sanity.test.ts`, `.github/workflows/ci.yml`
- Modify: `package.json` scripts, `tsconfig.json` paths, `.gitignore`

**Interfaces:**
- Produces: the scripts `pnpm dev | build | start | lint | typecheck | test | e2e`; the path aliases `@/*` → `src/*` and `@content/*` → `content/*`; and Vitest with jsdom, jest-dom matchers, and React support.

- [ ] **Step 1: Create a feature branch**

```bash
git checkout main && git pull --ff-only 2>/dev/null; git checkout -b feat/plan1-foundation-checklist
git merge --no-edit docs/design-spec   # brings the spec and the plan onto this branch
```

- [ ] **Step 2: Scaffold Next.js in a temp folder and copy it in**

The repo already contains `LICENSE`, `README.md` and `docs/`, and create-next-app refuses a non-empty directory. Scaffold in a sibling folder instead, then copy the files over.

```bash
cd ..
pnpm create next-app@latest aiontools-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --no-turbopack --yes
cd aiontools-scaffold && rm -rf .git node_modules README.md && cp -r . ../aiontools/ && cd .. && rm -rf aiontools-scaffold
cd aiontools && pnpm install
```

If `--no-turbopack` is rejected because the flag no longer exists, drop it.

- [ ] **Step 3: Install the runtime and dev dependencies**

```bash
pnpm add next-intl zustand zod lucide-react
pnpm add -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @playwright/test
```

- [ ] **Step 4: Initialise shadcn/ui and add components**

```bash
pnpm dlx shadcn@latest init -d
pnpm dlx shadcn@latest add button card checkbox input label select tabs dialog sonner tooltip collapsible badge
```

`-d` picks the defaults. The resulting `components.json` has to point at `src/components/ui` and `src/lib/utils.ts`.

- [ ] **Step 5: Add the `@content` alias in `tsconfig.json`**

In `compilerOptions.paths`, keep `"@/*": ["./src/*"]` and add:

```json
"@content/*": ["./content/*"]
```

Make sure `"resolveJsonModule": true` is present in `compilerOptions`, and add it if it is missing.

- [ ] **Step 6: Create `vitest.config.mts` and `vitest.setup.ts`**

```ts
// vitest.config.mts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.ts"],
  },
});
```

```ts
// vitest.setup.ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 7: Add the scripts to `package.json`**

Keep the scaffold's `dev`, `build`, `start` and `lint`. Add:

```json
"typecheck": "tsc --noEmit",
"test": "vitest run",
"test:watch": "vitest",
"e2e": "playwright test"
```

- [ ] **Step 8: Write a sanity test to prove the harness works**

```ts
// src/lib/sanity.test.ts
import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("tooling", () => {
  it("resolves @/ alias and runs", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
});
```

Run: `pnpm test`
Expected: 1 passed.

- [ ] **Step 9: Create the CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm e2e
```

`pnpm/action-setup@v4` reads the pnpm version from the `packageManager` field. If the scaffold did not add that field, add `"packageManager": "pnpm@<output of pnpm -v>"` to `package.json`.

- [ ] **Step 10: Ignore Playwright artifacts in `.gitignore`**

Append:

```
/test-results/
/playwright-report/
```

- [ ] **Step 11: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: every command exits 0.

```bash
git add -A
git commit -m "chore: scaffold Next.js app with tooling and CI

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Regions and reset math

**Files:**
- Create: `src/lib/regions.ts`, `src/lib/reset.ts`
- Test: `src/lib/reset.test.ts`

**Interfaces:**
- Produces:
  - `type RegionId = "global" | "kr" | "tw"` and `REGION_IDS: readonly RegionId[]`
  - `type ResetPeriod = "day" | "week"`
  - `lastResetAt(now: Date, region: RegionId, period: ResetPeriod): Date`, which returns the most recent reset instant at or before `now`
  - `nextResetAt(now: Date, region: RegionId, period: ResetPeriod): Date`, which returns the next reset strictly after `now`

- [ ] **Step 1: Write the failing tests**

Date reference: 2026-10-14 is a Wednesday.

```ts
// src/lib/reset.test.ts
import { describe, it, expect } from "vitest";
import { lastResetAt, nextResetAt } from "./reset";

const d = (iso: string) => new Date(iso);

describe("lastResetAt — global (07:00 UTC, Wednesday)", () => {
  it("before today's reset returns yesterday 07:00", () => {
    expect(lastResetAt(d("2026-10-14T06:59:59.999Z"), "global", "day").toISOString()).toBe("2026-10-13T07:00:00.000Z");
  });
  it("exactly at reset counts as already reset", () => {
    expect(lastResetAt(d("2026-10-14T07:00:00.000Z"), "global", "day").toISOString()).toBe("2026-10-14T07:00:00.000Z");
  });
  it("weekly just before Wednesday reset returns previous Wednesday", () => {
    expect(lastResetAt(d("2026-10-14T06:59:59.999Z"), "global", "week").toISOString()).toBe("2026-10-07T07:00:00.000Z");
  });
  it("weekly at Wednesday reset returns that instant", () => {
    expect(lastResetAt(d("2026-10-14T07:00:00.000Z"), "global", "week").toISOString()).toBe("2026-10-14T07:00:00.000Z");
  });
  it("weekly on Sunday returns the Wednesday before", () => {
    expect(lastResetAt(d("2026-10-18T12:00:00.000Z"), "global", "week").toISOString()).toBe("2026-10-14T07:00:00.000Z");
  });
});

describe("lastResetAt — kr (05:00 UTC+9 = 20:00 UTC previous day)", () => {
  it("daily", () => {
    expect(lastResetAt(d("2026-10-13T19:59:59.999Z"), "kr", "day").toISOString()).toBe("2026-10-12T20:00:00.000Z");
    expect(lastResetAt(d("2026-10-13T20:00:00.000Z"), "kr", "day").toISOString()).toBe("2026-10-13T20:00:00.000Z");
  });
  it("weekly uses Korean-local Wednesday", () => {
    // 2026-10-13T20:00Z = Wed 2026-10-14 05:00 KST
    expect(lastResetAt(d("2026-10-13T20:00:00.000Z"), "kr", "week").toISOString()).toBe("2026-10-13T20:00:00.000Z");
    expect(lastResetAt(d("2026-10-13T19:59:00.000Z"), "kr", "week").toISOString()).toBe("2026-10-06T20:00:00.000Z");
  });
});

describe("lastResetAt — tw (05:00 UTC+8 = 21:00 UTC previous day)", () => {
  it("daily", () => {
    expect(lastResetAt(d("2026-10-13T21:30:00.000Z"), "tw", "day").toISOString()).toBe("2026-10-13T21:00:00.000Z");
  });
});

describe("nextResetAt", () => {
  it("is strictly after now", () => {
    expect(nextResetAt(d("2026-10-14T07:00:00.000Z"), "global", "day").toISOString()).toBe("2026-10-15T07:00:00.000Z");
    expect(nextResetAt(d("2026-10-14T06:00:00.000Z"), "global", "week").toISOString()).toBe("2026-10-14T07:00:00.000Z");
  });
});
```

- [ ] **Step 2: Run the tests and check that they fail**

Run: `pnpm test src/lib/reset.test.ts`
Expected: FAIL. The error should say it cannot find module `./reset`.

- [ ] **Step 3: Implement `regions.ts` and `reset.ts`**

```ts
// src/lib/regions.ts
export const REGION_IDS = ["global", "kr", "tw"] as const;
export type RegionId = (typeof REGION_IDS)[number];

// shortcut: fixed UTC offsets — valid because none of these server clocks observe DST; switch to a tz library if a DST region is added.
export const REGIONS: Record<RegionId, { offsetMin: number; resetHour: number; weeklyDay: number }> = {
  global: { offsetMin: 0, resetHour: 7, weeklyDay: 3 }, // Wednesday
  kr: { offsetMin: 9 * 60, resetHour: 5, weeklyDay: 3 },
  tw: { offsetMin: 8 * 60, resetHour: 5, weeklyDay: 3 },
};
```

```ts
// src/lib/reset.ts
import { REGIONS, type RegionId } from "./regions";

export type ResetPeriod = "day" | "week";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export function lastResetAt(now: Date, region: RegionId, period: ResetPeriod): Date {
  const { offsetMin, resetHour, weeklyDay } = REGIONS[region];
  // Shift so every reset instant lands on a multiple of DAY.
  const shift = offsetMin * 60_000 - resetHour * HOUR;
  let start = Math.floor((now.getTime() + shift) / DAY) * DAY;
  if (period === "week") {
    const weekday = new Date(start).getUTCDay(); // server-local weekday of that reset
    start -= ((weekday - weeklyDay + 7) % 7) * DAY;
  }
  return new Date(start - shift);
}

export function nextResetAt(now: Date, region: RegionId, period: ResetPeriod): Date {
  return new Date(lastResetAt(now, region, period).getTime() + (period === "day" ? DAY : 7 * DAY));
}
```

- [ ] **Step 4: Run the tests and check that they pass**

Run: `pnpm test src/lib/reset.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/regions.ts src/lib/reset.ts src/lib/reset.test.ts
git commit -m "feat: add region reset rules and reset math

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Activities content and class list

**Files:**
- Create: `content/activities.json`, `src/lib/activities.ts`, `src/lib/classes.ts`
- Test: `src/lib/activities.test.ts`

**Interfaces:**
- Consumes: `ResetPeriod` from `@/lib/reset`
- Produces:
  - `type Text = { en: string; it?: string }`
  - `type Section = "daily" | "weekly" | "recharge"` and `SECTIONS: readonly Section[]`
  - `type Activity` and `ACTIVITIES: Activity[]`
  - `maxFor(a: Activity, isMain: boolean): number`, which returns `0` when the activity does not apply
  - `resetPeriod(a: Activity): ResetPeriod`
  - `localize(t: Text, locale: string): string`
  - `CLASSES: { id: string; name: string }[]` and `DEFAULT_CLASS_ID = "chanter"`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/activities.test.ts
import { describe, it, expect } from "vitest";
import { ACTIVITIES, maxFor, resetPeriod, localize, type Activity } from "./activities";

const byId = (id: string) => ACTIVITIES.find((a) => a.id === id)!;

describe("ACTIVITIES content", () => {
  it("has unique ids", () => {
    const ids = ACTIVITIES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("covers all three sections", () => {
    expect(new Set(ACTIVITIES.map((a) => a.section))).toEqual(new Set(["daily", "weekly", "recharge"]));
  });
});

describe("maxFor", () => {
  it("main-only activity is 0 for alts", () => {
    expect(maxFor(byId("duty-missions"), true)).toBe(5);
    expect(maxFor(byId("duty-missions"), false)).toBe(0);
  });
  it("uses altMax for alts when present", () => {
    expect(maxFor(byId("substance-morph"), true)).toBe(20);
    expect(maxFor(byId("substance-morph"), false)).toBe(4);
  });
  it("recharge uses perDay", () => {
    expect(maxFor(byId("nightmare"), false)).toBe(2);
  });
});

describe("resetPeriod", () => {
  it("weekly activities reset weekly, recharge daily", () => {
    expect(resetPeriod(byId("daily-dungeon"))).toBe("week");
    expect(resetPeriod(byId("shugo-festival-key"))).toBe("day");
  });
});

describe("localize", () => {
  it("falls back to en", () => {
    expect(localize({ en: "Hi" }, "it")).toBe("Hi");
    expect(localize({ en: "Hi", it: "Ciao" }, "it")).toBe("Ciao");
  });
});

it("Activity type rejects nothing at runtime here", () => {
  const a: Activity = byId("battlefield");
  expect(a.scope).toBe("both");
});
```

- [ ] **Step 2: Run the tests and check that they fail**

Run: `pnpm test src/lib/activities.test.ts`
Expected: FAIL. The error should say it cannot find module `./activities`.

- [ ] **Step 3: Create `content/activities.json`**

The data is transcribed from the sheet's Checklist tab, with typos fixed and limits curated.

```json
[
  { "id": "duty-missions", "name": "Duty Missions", "section": "daily", "scope": "main", "limit": { "max": 5, "period": "day" } },
  { "id": "supply-requests-daily", "name": "Supply Requests (Daily)", "section": "daily", "scope": "both", "limit": { "max": 1, "period": "day" } },

  { "id": "ascension-trial", "name": "Ascension Trial", "section": "weekly", "scope": "both", "limit": { "max": 3, "period": "week" },
    "note": { "en": "Score 4,000 for the achievement rewards. Higher difficulty later in the week.", "it": "Fai 4.000 punti per le ricompense achievement. Difficoltà più alta verso fine settimana." } },
  { "id": "daily-dungeon", "name": "Daily Dungeon", "section": "weekly", "scope": "main", "limit": { "max": 14, "period": "week" },
    "note": { "en": "Tickets reset weekly despite the name.", "it": "I ticket si resettano settimanalmente nonostante il nome." } },
  { "id": "battlefield", "name": "Battlefield", "section": "weekly", "scope": "both", "limit": { "max": 3, "period": "week" },
    "note": { "en": "Counts victories.", "it": "Contano le vittorie." } },
  { "id": "sanctuary", "name": "Sanctuary", "section": "weekly", "scope": "both", "limit": { "max": 1, "period": "week" } },
  { "id": "substance-morph", "name": "Substance Morph", "section": "weekly", "scope": "both", "limit": { "max": 20, "period": "week", "altMax": 4 } },
  { "id": "subscriber-shop", "name": "Subscriber Shop", "section": "weekly", "scope": "both", "limit": { "max": 1, "period": "week" } },
  { "id": "command-missions", "name": "Command Missions", "section": "weekly", "scope": "main", "limit": { "max": 12, "period": "week" } },
  { "id": "abyss-command-missions", "name": "Abyss Command Missions", "section": "weekly", "scope": "main", "limit": { "max": 20, "period": "week" } },
  { "id": "abyss-corridor", "name": "Abyss Corridor", "section": "weekly", "scope": "both", "limit": { "max": 3, "period": "week" },
    "note": { "en": "0–3 per Abyss war, only if your faction wins the Abyss events.", "it": "0–3 per guerra dell'Abisso, solo se la tua fazione vince gli eventi dell'Abisso." } },
  { "id": "supply-requests-weekly", "name": "Supply Requests (Weekly)", "section": "weekly", "scope": "both", "limit": { "max": 1, "period": "week" } },

  { "id": "shugo-festival-key", "name": "Shugo Festival Reward Key", "section": "recharge", "scope": "main", "limit": { "perDay": 3, "cap": 12, "capSub": 21 } },
  { "id": "nightmare", "name": "Nightmare", "section": "recharge", "scope": "both", "limit": { "perDay": 2, "cap": 14 } },
  { "id": "dimensional-invasion", "name": "Dimensional Invasion", "section": "recharge", "scope": "main", "limit": { "perDay": 1, "cap": 7 } },
  { "id": "transcendence", "name": "Transcendence", "section": "recharge", "scope": "both", "limit": { "max": 1, "period": "day" },
    "note": { "en": "Uses Odyle Energy (40/80 per run). 1,600+ gear score.", "it": "Usa Odyle Energy (40/80 per run). Gear score 1.600+." } },
  { "id": "conquest", "name": "Conquest", "section": "recharge", "scope": "both", "limit": { "max": 1, "period": "day" },
    "note": { "en": "Uses Odyle Energy.", "it": "Usa Odyle Energy." } }
]
```

- [ ] **Step 4: Implement `activities.ts` and `classes.ts`**

```ts
// src/lib/activities.ts
import { z } from "zod";
import raw from "@content/activities.json";
import type { ResetPeriod } from "./reset";

const TextSchema = z.object({ en: z.string().min(1), it: z.string().min(1).optional() });
export type Text = z.infer<typeof TextSchema>;

export const SECTIONS = ["daily", "weekly", "recharge"] as const;
export type Section = (typeof SECTIONS)[number];

const LimitSchema = z.union([
  z.object({ max: z.number().int().positive(), period: z.enum(["day", "week"]), altMax: z.number().int().positive().optional() }),
  z.object({ perDay: z.number().int().positive(), cap: z.number().int().positive(), capSub: z.number().int().positive().optional() }),
]);

const ActivitySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  section: z.enum(SECTIONS),
  scope: z.enum(["main", "both"]),
  limit: LimitSchema,
  note: TextSchema.optional(),
});
export type Activity = z.infer<typeof ActivitySchema>;

// Parsed at module load: malformed content fails the build, not the user.
export const ACTIVITIES: Activity[] = z.array(ActivitySchema).parse(raw);

export function maxFor(a: Activity, isMain: boolean): number {
  if (a.scope === "main" && !isMain) return 0;
  if ("perDay" in a.limit) return a.limit.perDay;
  return isMain ? a.limit.max : (a.limit.altMax ?? a.limit.max);
}

export function resetPeriod(a: Activity): ResetPeriod {
  return "period" in a.limit ? a.limit.period : "day";
}

export function localize(t: Text, locale: string): string {
  return (locale === "it" && t.it) || t.en;
}
```

```ts
// src/lib/classes.ts
// shortcut: hardcoded class list until plan 3 imports class builds; replace with content/classes then.
export const CLASSES = [
  { id: "chanter", name: "Chanter" },
  { id: "ranger", name: "Ranger" },
  { id: "cleric", name: "Cleric" },
  { id: "spirit-master", name: "Spirit Master" },
  { id: "gladiator", name: "Gladiator" },
  { id: "sorcerer", name: "Sorcerer" },
  { id: "templar", name: "Templar" },
  { id: "assassin", name: "Assassin" },
] as const;

export const DEFAULT_CLASS_ID = "chanter";

export const className = (id: string) => CLASSES.find((c) => c.id === id)?.name ?? id;
```

- [ ] **Step 5: Run the tests and check that they pass**

Run: `pnpm test src/lib/activities.test.ts`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add content/activities.json src/lib/activities.ts src/lib/activities.test.ts src/lib/classes.ts
git commit -m "feat: add curated checklist activities and class list

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: UserData schema, defaults, parsing and import

**Files:**
- Create: `src/lib/user-data.ts`
- Test: `src/lib/user-data.test.ts`

**Interfaces:**
- Consumes: `REGION_IDS`, `RegionId` and `lastResetAt`
- Produces:
  - `UserDataSchema` (Zod) and `type UserData`
  - `USER_DATA_VERSION = 1` and `MAX_IMPORT_CHARS = 65_536`
  - `createDefaultUserData(now: Date): UserData`
  - `migrate(raw: unknown): unknown`
  - `parseStored(raw: string | null, now: Date): { data: UserData; corrupted: boolean }`
  - `parseImported(text: string): UserData | null`
  - `setSettings(data: UserData, patch: Partial<UserData["settings"]>): UserData`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/user-data.test.ts
import { describe, it, expect } from "vitest";
import { createDefaultUserData, parseStored, parseImported, setSettings, UserDataSchema, MAX_IMPORT_CHARS } from "./user-data";

const now = new Date("2026-10-14T10:00:00.000Z");

describe("createDefaultUserData", () => {
  it("is valid and anchored to the current reset window", () => {
    const d = createDefaultUserData(now);
    expect(UserDataSchema.safeParse(d).success).toBe(true);
    expect(d.checklist.lastDaily).toBe("2026-10-14T07:00:00.000Z");
    expect(d.checklist.lastWeekly).toBe("2026-10-14T07:00:00.000Z");
    expect(d.settings).toEqual({ region: "global", theme: "dark", accent: "elyos", onboarded: false });
  });
});

describe("parseStored", () => {
  it("null means first visit, not corrupted", () => {
    expect(parseStored(null, now).corrupted).toBe(false);
  });
  it("round-trips valid data", () => {
    const d = createDefaultUserData(now);
    expect(parseStored(JSON.stringify(d), now)).toEqual({ data: d, corrupted: false });
  });
  it("invalid JSON is corrupted and falls back to defaults", () => {
    const r = parseStored("{bad", now);
    expect(r.corrupted).toBe(true);
    expect(r.data).toEqual(createDefaultUserData(now));
  });
  it("unknown version is corrupted", () => {
    const d = { ...createDefaultUserData(now), version: 99 };
    expect(parseStored(JSON.stringify(d), now).corrupted).toBe(true);
  });
});

describe("parseImported", () => {
  it("accepts a valid export", () => {
    const d = createDefaultUserData(now);
    expect(parseImported(JSON.stringify(d))).toEqual(d);
  });
  it("rejects invalid JSON, wrong shape and oversized input", () => {
    expect(parseImported("not json")).toBeNull();
    expect(parseImported(JSON.stringify({ hello: "world" }))).toBeNull();
    expect(parseImported(" ".repeat(MAX_IMPORT_CHARS + 1))).toBeNull();
  });
  it("rejects a character list without exactly one main", () => {
    const d = createDefaultUserData(now);
    d.characters = [{ id: "a", name: "A", classId: "chanter", isMain: false }];
    expect(parseImported(JSON.stringify(d))).toBeNull();
  });
});

describe("setSettings", () => {
  it("merges a patch", () => {
    const d = setSettings(createDefaultUserData(now), { region: "kr" });
    expect(d.settings.region).toBe("kr");
    expect(d.settings.theme).toBe("dark");
  });
});
```

- [ ] **Step 2: Run the tests and check that they fail**

Run: `pnpm test src/lib/user-data.test.ts`
Expected: FAIL. The error should say it cannot find module `./user-data`.

- [ ] **Step 3: Implement**

```ts
// src/lib/user-data.ts
import { z } from "zod";
import { REGION_IDS } from "./regions";
import { lastResetAt } from "./reset";

export const USER_DATA_VERSION = 1;
export const MAX_IMPORT_CHARS = 65_536;

const CharacterSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(32),
  classId: z.string().min(1).max(32),
  isMain: z.boolean(),
});

export const UserDataSchema = z
  .object({
    version: z.literal(USER_DATA_VERSION),
    updatedAt: z.iso.datetime(),
    settings: z.object({
      region: z.enum(REGION_IDS),
      theme: z.enum(["dark", "light"]),
      accent: z.enum(["elyos", "asmodian"]),
      onboarded: z.boolean(),
    }),
    characters: z.array(CharacterSchema).max(9),
    checklist: z.object({
      progress: z.record(z.string(), z.record(z.string(), z.number().int().min(0).max(999))),
      lastDaily: z.iso.datetime(),
      lastWeekly: z.iso.datetime(),
    }),
    crafting: z.object({
      prices: z.record(z.string(), z.number().min(0)),
      rates: z.record(z.string(), z.number().gt(0).max(1)),
      tax: z.number().min(0).max(1).optional(),
    }),
    roadmap: z.object({ done: z.array(z.string()) }),
  })
  .refine((d) => d.characters.length === 0 || d.characters.filter((c) => c.isMain).length === 1, {
    message: "exactly one main character required",
  });

export type UserData = z.infer<typeof UserDataSchema>;

export function createDefaultUserData(now: Date): UserData {
  return {
    version: USER_DATA_VERSION,
    updatedAt: now.toISOString(),
    settings: { region: "global", theme: "dark", accent: "elyos", onboarded: false },
    characters: [],
    checklist: {
      progress: {},
      lastDaily: lastResetAt(now, "global", "day").toISOString(),
      lastWeekly: lastResetAt(now, "global", "week").toISOString(),
    },
    crafting: { prices: {}, rates: {} },
    roadmap: { done: [] },
  };
}

// Add `n: (d) => upgraded` steps here when USER_DATA_VERSION is bumped.
const MIGRATIONS: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = {};

export function migrate(raw: unknown): unknown {
  let d = raw as Record<string, unknown>;
  while (d && typeof d.version === "number" && d.version < USER_DATA_VERSION && MIGRATIONS[d.version]) {
    d = MIGRATIONS[d.version](d);
  }
  return d;
}

function parseJson(text: string): UserData | null {
  try {
    const r = UserDataSchema.safeParse(migrate(JSON.parse(text)));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

export function parseStored(raw: string | null, now: Date): { data: UserData; corrupted: boolean } {
  if (raw === null) return { data: createDefaultUserData(now), corrupted: false };
  const data = parseJson(raw);
  return data ? { data, corrupted: false } : { data: createDefaultUserData(now), corrupted: true };
}

export function parseImported(text: string): UserData | null {
  return text.length > MAX_IMPORT_CHARS ? null : parseJson(text);
}

export function setSettings(data: UserData, patch: Partial<UserData["settings"]>): UserData {
  return { ...data, settings: { ...data.settings, ...patch } };
}
```

- [ ] **Step 4: Run the tests and check that they pass**

Run: `pnpm test src/lib/user-data.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/user-data.ts src/lib/user-data.test.ts
git commit -m "feat: add versioned UserData schema with safe parsing and import

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Checklist and character operations (pure)

**Files:**
- Create: `src/lib/checklist.ts`, `src/lib/characters.ts`
- Test: `src/lib/checklist.test.ts`, `src/lib/characters.test.ts`

**Interfaces:**
- Consumes: `UserData`, `createDefaultUserData`, `Activity`, `ACTIVITIES`, `maxFor`, `resetPeriod`, `Section` and `lastResetAt`
- Produces:
  - `applyResets(data: UserData, now: Date, activities: Activity[]): UserData`. Returns the same reference when nothing resets.
  - `getCount(data: UserData, charId: string, a: Activity): number`. Clamped to the current `maxFor`.
  - `setCount(data: UserData, charId: string, a: Activity, count: number): UserData`. Returns the same reference when nothing changes or the activity does not apply.
  - `progressFor(data: UserData, charId: string, activities: Activity[], sections: readonly Section[]): { done: number; total: number }`
  - `MAX_CHARACTERS = 9`
  - `addCharacter(data, input: { name: string; classId: string }, id?: string): UserData`
  - `removeCharacter(data, id: string): UserData`
  - `setMain(data, id: string): UserData`
  - `updateCharacter(data, id: string, patch: { name?: string; classId?: string }): UserData`

- [ ] **Step 1: Write the failing checklist tests**

```ts
// src/lib/checklist.test.ts
import { describe, it, expect } from "vitest";
import { applyResets, getCount, setCount, progressFor } from "./checklist";
import { addCharacter } from "./characters";
import { createDefaultUserData, type UserData } from "./user-data";
import { ACTIVITIES } from "./activities";

const a = (id: string) => ACTIVITIES.find((x) => x.id === id)!;
const t0 = new Date("2026-10-14T10:00:00.000Z"); // Wed, after reset

function withChars(): UserData {
  let d = createDefaultUserData(t0);
  d = addCharacter(d, { name: "Main", classId: "chanter" }, "m");
  d = addCharacter(d, { name: "Alt", classId: "cleric" }, "x");
  return d;
}

describe("setCount / getCount", () => {
  it("clamps to 0..max", () => {
    let d = setCount(withChars(), "m", a("duty-missions"), 99);
    expect(getCount(d, "m", a("duty-missions"))).toBe(5);
    d = setCount(d, "m", a("duty-missions"), -3);
    expect(getCount(d, "m", a("duty-missions"))).toBe(0);
  });
  it("is a no-op (same reference) for main-only activity on an alt", () => {
    const d = withChars();
    expect(setCount(d, "x", a("duty-missions"), 1)).toBe(d);
  });
  it("is a no-op for unknown character", () => {
    const d = withChars();
    expect(setCount(d, "nope", a("nightmare"), 1)).toBe(d);
  });
  it("getCount clamps a stored count above the alt max", () => {
    let d = setCount(withChars(), "m", a("substance-morph"), 15);
    d = { ...d, characters: d.characters.map((c) => ({ ...c, isMain: c.id === "x" })) };
    expect(getCount(d, "m", a("substance-morph"))).toBe(4);
  });
});

describe("applyResets", () => {
  it("returns same reference when nothing to reset", () => {
    const d = withChars();
    expect(applyResets(d, t0, ACTIVITIES)).toBe(d);
  });
  it("daily reset clears daily and recharge, keeps weekly", () => {
    let d = withChars();
    d = setCount(d, "m", a("duty-missions"), 3);
    d = setCount(d, "m", a("nightmare"), 2);
    d = setCount(d, "m", a("battlefield"), 2);
    const r = applyResets(d, new Date("2026-10-15T07:00:00.000Z"), ACTIVITIES);
    expect(getCount(r, "m", a("duty-missions"))).toBe(0);
    expect(getCount(r, "m", a("nightmare"))).toBe(0);
    expect(getCount(r, "m", a("battlefield"))).toBe(2);
    expect(r.checklist.lastDaily).toBe("2026-10-15T07:00:00.000Z");
    expect(r.updatedAt).toBe(d.updatedAt);
  });
  it("after 3 weeks away resets both once and is idempotent", () => {
    let d = setCount(withChars(), "m", a("battlefield"), 2);
    const later = new Date("2026-11-04T12:00:00.000Z");
    const r1 = applyResets(d, later, ACTIVITIES);
    expect(getCount(r1, "m", a("battlefield"))).toBe(0);
    expect(r1.checklist.lastWeekly).toBe("2026-11-04T07:00:00.000Z");
    expect(applyResets(r1, later, ACTIVITIES)).toBe(r1);
  });
});

describe("progressFor", () => {
  it("sums only applicable activities", () => {
    let d = setCount(withChars(), "x", a("nightmare"), 1);
    const p = progressFor(d, "x", ACTIVITIES, ["recharge"]);
    // alt: nightmare(2) + transcendence(1) + conquest(1); shugo & dimensional are main-only
    expect(p).toEqual({ done: 1, total: 4 });
  });
});
```

- [ ] **Step 2: Write the failing characters tests**

```ts
// src/lib/characters.test.ts
import { describe, it, expect } from "vitest";
import { addCharacter, removeCharacter, setMain, updateCharacter, MAX_CHARACTERS } from "./characters";
import { setCount } from "./checklist";
import { createDefaultUserData, UserDataSchema } from "./user-data";
import { ACTIVITIES } from "./activities";

const now = new Date("2026-10-14T10:00:00.000Z");
const base = () => createDefaultUserData(now);

describe("addCharacter", () => {
  it("first is main, next are alts", () => {
    let d = addCharacter(base(), { name: " A ", classId: "chanter" }, "a");
    d = addCharacter(d, { name: "B", classId: "cleric" }, "b");
    expect(d.characters).toEqual([
      { id: "a", name: "A", classId: "chanter", isMain: true },
      { id: "b", name: "B", classId: "cleric", isMain: false },
    ]);
  });
  it("ignores empty names and the 10th character", () => {
    const d = base();
    expect(addCharacter(d, { name: "   ", classId: "chanter" })).toBe(d);
    let full = d;
    for (let i = 0; i < MAX_CHARACTERS; i++) full = addCharacter(full, { name: `C${i}`, classId: "chanter" }, `c${i}`);
    expect(addCharacter(full, { name: "Z", classId: "chanter" })).toBe(full);
  });
  it("truncates names to 32 chars", () => {
    const d = addCharacter(base(), { name: "x".repeat(40), classId: "chanter" }, "a");
    expect(d.characters[0].name).toHaveLength(32);
  });
});

describe("removeCharacter", () => {
  it("promotes next character when main is removed and drops progress", () => {
    let d = addCharacter(base(), { name: "A", classId: "chanter" }, "a");
    d = addCharacter(d, { name: "B", classId: "cleric" }, "b");
    d = setCount(d, "a", ACTIVITIES[0], 1);
    d = removeCharacter(d, "a");
    expect(d.characters).toEqual([{ id: "b", name: "B", classId: "cleric", isMain: true }]);
    expect(d.checklist.progress.a).toBeUndefined();
    expect(UserDataSchema.safeParse(d).success).toBe(true);
  });
});

describe("setMain / updateCharacter", () => {
  it("keeps exactly one main", () => {
    let d = addCharacter(base(), { name: "A", classId: "chanter" }, "a");
    d = addCharacter(d, { name: "B", classId: "cleric" }, "b");
    d = setMain(d, "b");
    expect(d.characters.map((c) => c.isMain)).toEqual([false, true]);
  });
  it("ignores empty name updates", () => {
    const d = addCharacter(base(), { name: "A", classId: "chanter" }, "a");
    expect(updateCharacter(d, "a", { name: "  " })).toBe(d);
    expect(updateCharacter(d, "a", { name: "New", classId: "ranger" }).characters[0]).toMatchObject({ name: "New", classId: "ranger" });
  });
});
```

- [ ] **Step 3: Run the tests and check that they fail**

Run: `pnpm test src/lib/checklist.test.ts src/lib/characters.test.ts`
Expected: FAIL. The errors should say the modules `./checklist` and `./characters` cannot be found.

- [ ] **Step 4: Implement `checklist.ts`**

```ts
// src/lib/checklist.ts
import type { UserData } from "./user-data";
import { maxFor, resetPeriod, type Activity, type Section } from "./activities";
import { lastResetAt } from "./reset";

const isMainChar = (data: UserData, charId: string) => data.characters.find((c) => c.id === charId)?.isMain;

export function applyResets(data: UserData, now: Date, activities: Activity[]): UserData {
  let next = data;
  for (const period of ["day", "week"] as const) {
    const key = period === "day" ? "lastDaily" : "lastWeekly";
    const boundary = lastResetAt(now, data.settings.region, period);
    if (new Date(next.checklist[key]) >= boundary) continue;
    const ids = new Set(activities.filter((a) => resetPeriod(a) === period).map((a) => a.id));
    const progress = Object.fromEntries(
      Object.entries(next.checklist.progress).map(([charId, counts]) => [
        charId,
        Object.fromEntries(Object.entries(counts).filter(([id]) => !ids.has(id))),
      ]),
    );
    next = { ...next, checklist: { ...next.checklist, progress, [key]: boundary.toISOString() } };
  }
  return next;
}

export function getCount(data: UserData, charId: string, a: Activity): number {
  const isMain = isMainChar(data, charId);
  if (isMain === undefined) return 0;
  return Math.min(data.checklist.progress[charId]?.[a.id] ?? 0, maxFor(a, isMain));
}

export function setCount(data: UserData, charId: string, a: Activity, count: number): UserData {
  const isMain = isMainChar(data, charId);
  if (isMain === undefined) return data;
  const max = maxFor(a, isMain);
  if (max === 0) return data;
  const value = Math.min(max, Math.max(0, Math.round(count)));
  if (value === (data.checklist.progress[charId]?.[a.id] ?? 0)) return data;
  return {
    ...data,
    checklist: {
      ...data.checklist,
      progress: { ...data.checklist.progress, [charId]: { ...data.checklist.progress[charId], [a.id]: value } },
    },
  };
}

export function progressFor(data: UserData, charId: string, activities: Activity[], sections: readonly Section[]) {
  const isMain = isMainChar(data, charId) ?? false;
  let done = 0;
  let total = 0;
  for (const a of activities) {
    if (!sections.includes(a.section)) continue;
    const max = maxFor(a, isMain);
    total += max;
    done += Math.min(data.checklist.progress[charId]?.[a.id] ?? 0, max);
  }
  return { done, total };
}
```

- [ ] **Step 5: Implement `characters.ts`**

```ts
// src/lib/characters.ts
import type { UserData } from "./user-data";

export const MAX_CHARACTERS = 9;
const cleanName = (name: string) => name.trim().slice(0, 32);

export function addCharacter(data: UserData, input: { name: string; classId: string }, id: string = crypto.randomUUID()): UserData {
  const name = cleanName(input.name);
  if (!name || data.characters.length >= MAX_CHARACTERS) return data;
  return { ...data, characters: [...data.characters, { id, name, classId: input.classId, isMain: data.characters.length === 0 }] };
}

export function removeCharacter(data: UserData, id: string): UserData {
  const removed = data.characters.find((c) => c.id === id);
  if (!removed) return data;
  const rest = data.characters.filter((c) => c.id !== id);
  const characters = removed.isMain && rest.length ? rest.map((c, i) => ({ ...c, isMain: i === 0 })) : rest;
  const progress = { ...data.checklist.progress };
  delete progress[id];
  return { ...data, characters, checklist: { ...data.checklist, progress } };
}

export function setMain(data: UserData, id: string): UserData {
  if (!data.characters.some((c) => c.id === id)) return data;
  return { ...data, characters: data.characters.map((c) => ({ ...c, isMain: c.id === id })) };
}

export function updateCharacter(data: UserData, id: string, patch: { name?: string; classId?: string }): UserData {
  const name = patch.name === undefined ? undefined : cleanName(patch.name);
  if (name === "") return data;
  return {
    ...data,
    characters: data.characters.map((c) =>
      c.id === id ? { ...c, ...(name !== undefined && { name }), ...(patch.classId && { classId: patch.classId }) } : c,
    ),
  };
}
```

- [ ] **Step 6: Run the tests and check that they pass**

Run: `pnpm test src/lib`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/checklist.ts src/lib/checklist.test.ts src/lib/characters.ts src/lib/characters.test.ts
git commit -m "feat: add pure checklist and character operations

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: User store with safe persistence

**Files:**
- Create: `src/store/user-store.ts`
- Test: `src/store/user-store.test.ts`

**Interfaces:**
- Consumes: `parseStored`, `createDefaultUserData`, `UserData`, `applyResets` and `ACTIVITIES`
- Produces: `STORAGE_KEY = "aiontools:user-data"` and `useUserStore`, a Zustand hook with this state:

```ts
{
  data: UserData;
  hydrated: boolean;
  corrupted: boolean;
  hydrate(now?: Date): void;          // reads localStorage, backs up corrupt raw, applies resets
  update(fn: (d: UserData) => UserData): void;   // user edit: bumps updatedAt when fn returns a new ref
  tickResets(now?: Date): void;       // automatic reset: does NOT bump updatedAt
}
```

Persistence: after hydration, every change to `data` is written to `localStorage[STORAGE_KEY]`. Any storage error is swallowed.

- [ ] **Step 1: Write the failing tests**

```ts
// src/store/user-store.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useUserStore, STORAGE_KEY } from "./user-store";
import { createDefaultUserData } from "@/lib/user-data";
import { addCharacter } from "@/lib/characters";

const now = new Date("2026-10-14T10:00:00.000Z");

beforeEach(() => {
  localStorage.clear();
  useUserStore.setState({ data: createDefaultUserData(now), hydrated: false, corrupted: false });
  vi.restoreAllMocks();
});

describe("useUserStore", () => {
  it("hydrates defaults on first visit", () => {
    useUserStore.getState().hydrate(now);
    expect(useUserStore.getState()).toMatchObject({ hydrated: true, corrupted: false });
  });

  it("backs up corrupt storage and starts fresh", () => {
    localStorage.setItem(STORAGE_KEY, "{bad");
    useUserStore.getState().hydrate(now);
    expect(useUserStore.getState().corrupted).toBe(true);
    expect(localStorage.getItem(`aiontools-backup-${now.getTime()}`)).toBe("{bad");
  });

  it("persists user edits and bumps updatedAt", () => {
    useUserStore.getState().hydrate(now);
    const before = useUserStore.getState().data.updatedAt;
    useUserStore.getState().update((d) => addCharacter(d, { name: "A", classId: "chanter" }, "a"));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.characters[0].name).toBe("A");
    expect(saved.updatedAt).not.toBe(before);
  });

  it("does not write when update returns same reference", () => {
    useUserStore.getState().hydrate(now);
    const spy = vi.spyOn(Storage.prototype, "setItem");
    useUserStore.getState().update((d) => d);
    expect(spy).not.toHaveBeenCalled();
  });

  it("tickResets does not bump updatedAt", () => {
    useUserStore.getState().hydrate(now);
    const before = useUserStore.getState().data.updatedAt;
    useUserStore.getState().tickResets(new Date("2026-10-15T08:00:00.000Z"));
    expect(useUserStore.getState().data.updatedAt).toBe(before);
    expect(useUserStore.getState().data.checklist.lastDaily).toBe("2026-10-15T07:00:00.000Z");
  });

  it("survives a throwing localStorage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });
    expect(() => useUserStore.getState().hydrate(now)).not.toThrow();
    expect(() => useUserStore.getState().update((d) => addCharacter(d, { name: "A", classId: "chanter" }))).not.toThrow();
    expect(useUserStore.getState().data.characters).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the tests and check that they fail**

Run: `pnpm test src/store`
Expected: FAIL. The error should say the module cannot be found.

- [ ] **Step 3: Implement**

```ts
// src/store/user-store.ts
import { create } from "zustand";
import { createDefaultUserData, parseStored, type UserData } from "@/lib/user-data";
import { applyResets } from "@/lib/checklist";
import { ACTIVITIES } from "@/lib/activities";

export const STORAGE_KEY = "aiontools:user-data";

type UserStore = {
  data: UserData;
  hydrated: boolean;
  corrupted: boolean;
  hydrate(now?: Date): void;
  update(fn: (d: UserData) => UserData): void;
  tickResets(now?: Date): void;
};

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable or full: keep working in memory.
  }
}

export const useUserStore = create<UserStore>()((set, get) => ({
  data: createDefaultUserData(new Date()),
  hydrated: false,
  corrupted: false,
  hydrate(now = new Date()) {
    const raw = read(STORAGE_KEY);
    const { data, corrupted } = parseStored(raw, now);
    if (corrupted && raw !== null) write(`aiontools-backup-${now.getTime()}`, raw);
    set({ data: applyResets(data, now, ACTIVITIES), hydrated: true, corrupted });
  },
  update(fn) {
    const prev = get().data;
    const next = fn(prev);
    if (next !== prev) set({ data: { ...next, updatedAt: new Date().toISOString() } });
  },
  tickResets(now = new Date()) {
    const prev = get().data;
    const next = applyResets(prev, now, ACTIVITIES);
    if (next !== prev) set({ data: next });
  },
}));

useUserStore.subscribe((state, prev) => {
  if (state.hydrated && state.data !== prev.data) write(STORAGE_KEY, JSON.stringify(state.data));
});
```

- [ ] **Step 4: Run the tests and check that they pass**

Run: `pnpm test src/store`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/store
git commit -m "feat: add user store with safe localStorage persistence

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: i18n routing and messages

**Files:**
- Create: `src/i18n/routing.ts`, `src/i18n/navigation.ts`, `src/i18n/request.ts`, `src/proxy.ts` (or `src/middleware.ts`), `messages/en.json`, `messages/it.json`, `tests/i18n-keys.test.ts`
- Modify: `next.config.ts`
- Delete: `src/app/layout.tsx` and `src/app/page.tsx` from the scaffold. Their replacements are created in Task 8. `src/app/globals.css` stays.

**Interfaces:**
- Produces:
  - `routing` with `locales: ["en", "it"]` and `defaultLocale: "en"`
  - `Link`, `usePathname`, `useRouter`, `redirect` and `getPathname` from `@/i18n/navigation`
  - Every message key listed below. Tasks 8 to 11 use only these keys.

- [ ] **Step 1: Write the failing key-parity test**

```ts
// tests/i18n-keys.test.ts
import { describe, it, expect } from "vitest";
import en from "../messages/en.json";
import it_ from "../messages/it.json";

const keys = (o: object, p = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));

describe("messages", () => {
  it("it.json has exactly the keys of en.json", () => {
    expect(keys(it_).sort()).toEqual(keys(en).sort());
  });
});
```

Run: `pnpm test tests/i18n-keys.test.ts`
Expected: FAIL, because the message files do not exist yet.

- [ ] **Step 2: Create `messages/en.json`**

```json
{
  "meta": { "title": "AionTools", "description": "Aion 2 tools: daily and weekly checklist, builds, crafting and guides." },
  "nav": { "label": "Main navigation", "home": "Home", "checklist": "Checklist", "settings": "Settings" },
  "reset": { "daily": "Daily reset", "weekly": "Weekly reset", "units": { "d": "d", "h": "h", "m": "m" } },
  "theme": { "toggle": "Toggle light/dark theme" },
  "locale": { "label": "Language", "en": "English", "it": "Italiano" },
  "footer": { "credits": "Data from community spreadsheets by Castform and others. Fan-made, not affiliated with NCSoft." },
  "home": {
    "title": "Today",
    "noCharacters": "No characters yet.",
    "addCharacters": "Add your characters",
    "openChecklist": "Open checklist",
    "main": "Main"
  },
  "checklist": {
    "title": "Checklist",
    "sections": { "daily": "Daily", "weekly": "Weekly", "recharge": "Recharge" },
    "activity": "Activity",
    "notApplicable": "Not available for alts",
    "cellLabel": "{activity}, {character}: {count} of {max}",
    "decrement": "Remove one from {activity}",
    "resetsIn": "Resets in {time}",
    "noCharacters": "Add a character to start tracking.",
    "goToSettings": "Open settings",
    "cap": "Stockpile cap: {cap}",
    "capSub": "Stockpile cap: {cap} ({capSub} with subscription)",
    "progressLabel": "{done} of {total}"
  },
  "settings": {
    "title": "Settings",
    "region": { "title": "Server region", "label": "Region", "global": "Global (EU/NA)", "kr": "Korea", "tw": "Taiwan" },
    "characters": {
      "title": "Characters",
      "name": "Name",
      "class": "Class",
      "main": "Main",
      "makeMain": "Make main",
      "add": "Add character",
      "remove": "Remove {name}",
      "limit": "Up to 1 main and 8 alts.",
      "empty": "No characters yet."
    },
    "appearance": { "title": "Appearance", "theme": "Theme", "dark": "Dark", "light": "Light", "accent": "Accent", "elyos": "Elyos", "asmodian": "Asmodian" },
    "data": {
      "title": "Your data",
      "hint": "Your progress is saved in this browser. Export a backup or move it to another browser.",
      "export": "Export JSON",
      "import": "Import JSON",
      "importError": "This file is not valid AionTools data.",
      "importDone": "Data imported.",
      "corrupted": "Saved data was unreadable. A backup was kept and the app started fresh."
    }
  },
  "onboarding": {
    "title": "Welcome to AionTools",
    "regionStep": "Which server region do you play on?",
    "charactersStep": "Add your characters. You can change them later in Settings.",
    "next": "Next",
    "skip": "Skip",
    "done": "Done"
  }
}
```

- [ ] **Step 3: Create `messages/it.json`**

```json
{
  "meta": { "title": "AionTools", "description": "Strumenti per Aion 2: checklist giornaliera e settimanale, build, crafting e guide." },
  "nav": { "label": "Navigazione principale", "home": "Home", "checklist": "Checklist", "settings": "Impostazioni" },
  "reset": { "daily": "Reset giornaliero", "weekly": "Reset settimanale", "units": { "d": "g", "h": "h", "m": "m" } },
  "theme": { "toggle": "Cambia tema chiaro/scuro" },
  "locale": { "label": "Lingua", "en": "English", "it": "Italiano" },
  "footer": { "credits": "Dati dai fogli della community di Castform e altri. Progetto fan-made, non affiliato a NCSoft." },
  "home": {
    "title": "Oggi",
    "noCharacters": "Nessun personaggio.",
    "addCharacters": "Aggiungi i tuoi personaggi",
    "openChecklist": "Apri checklist",
    "main": "Main"
  },
  "checklist": {
    "title": "Checklist",
    "sections": { "daily": "Giornaliere", "weekly": "Settimanali", "recharge": "Ricariche" },
    "activity": "Attività",
    "notApplicable": "Non disponibile per gli alt",
    "cellLabel": "{activity}, {character}: {count} di {max}",
    "decrement": "Togli uno da {activity}",
    "resetsIn": "Reset tra {time}",
    "noCharacters": "Aggiungi un personaggio per iniziare.",
    "goToSettings": "Apri impostazioni",
    "cap": "Accumulo massimo: {cap}",
    "capSub": "Accumulo massimo: {cap} ({capSub} con abbonamento)",
    "progressLabel": "{done} di {total}"
  },
  "settings": {
    "title": "Impostazioni",
    "region": { "title": "Regione server", "label": "Regione", "global": "Global (EU/NA)", "kr": "Corea", "tw": "Taiwan" },
    "characters": {
      "title": "Personaggi",
      "name": "Nome",
      "class": "Classe",
      "main": "Main",
      "makeMain": "Imposta come main",
      "add": "Aggiungi personaggio",
      "remove": "Rimuovi {name}",
      "limit": "Massimo 1 main e 8 alt.",
      "empty": "Nessun personaggio."
    },
    "appearance": { "title": "Aspetto", "theme": "Tema", "dark": "Scuro", "light": "Chiaro", "accent": "Accento", "elyos": "Elyos", "asmodian": "Asmodian" },
    "data": {
      "title": "I tuoi dati",
      "hint": "I progressi sono salvati in questo browser. Esporta un backup o spostali su un altro browser.",
      "export": "Esporta JSON",
      "import": "Importa JSON",
      "importError": "Questo file non contiene dati AionTools validi.",
      "importDone": "Dati importati.",
      "corrupted": "I dati salvati erano illeggibili. È stato tenuto un backup e l'app è ripartita da zero."
    }
  },
  "onboarding": {
    "title": "Benvenuto su AionTools",
    "regionStep": "Su quale regione server giochi?",
    "charactersStep": "Aggiungi i tuoi personaggi. Puoi modificarli dopo nelle Impostazioni.",
    "next": "Avanti",
    "skip": "Salta",
    "done": "Fatto"
  }
}
```

- [ ] **Step 4: Create the i18n config files**

```ts
// src/i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({ locales: ["en", "it"], defaultLocale: "en" });
```

```ts
// src/i18n/navigation.ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
```

```ts
// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
```

Check the major version of `next` in `package.json`. From 16 onwards, create `src/proxy.ts`. For 15 and earlier, create `src/middleware.ts`. The content is the same:

```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = { matcher: "/((?!api|_next|_vercel|.*\\..*).*)" };
```

```ts
// next.config.ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {};

export default createNextIntlPlugin()(nextConfig);
```

- [ ] **Step 5: Remove the scaffold root layout and page**

```bash
git rm src/app/layout.tsx src/app/page.tsx
```

- [ ] **Step 6: Run the parity test**

Run: `pnpm test tests/i18n-keys.test.ts`
Expected: PASS.

Do not run `pnpm build` yet. It fails until Task 8 adds `[locale]/layout.tsx`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add next-intl routing and IT/EN messages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Theme, fonts, app shell, reset countdown

**Files:**
- Create:
  - `src/lib/format.ts` and its test `src/lib/format.test.ts`
  - `src/hooks/use-now.ts`
  - `src/components/store-hydrator.tsx`
  - in `src/components/shell/`: `nav-items.ts`, `app-shell.tsx`, `sidebar.tsx`, `bottom-nav.tsx`, `top-bar.tsx`, `locale-switch.tsx`, `theme-toggle.tsx`, `reset-countdown.tsx`, `footer.tsx`
  - `src/app/[locale]/layout.tsx` and `src/app/[locale]/page.tsx` (a placeholder until Task 11)
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `useUserStore`, `setSettings`, `nextResetAt`, `routing` and the `@/i18n/navigation` exports
- Produces:
  - `formatCountdown(ms: number, units: { d: string; h: string; m: string }): string`
  - `useNow(intervalMs?: number): Date | null`
  - `<ResetCountdown period="day" | "week" variant?="compact" | "large" />`
  - `<AppShell>`
  - `NAV_ITEMS`

- [ ] **Step 1: Write the failing `formatCountdown` test**

```ts
// src/lib/format.test.ts
import { describe, it, expect } from "vitest";
import { formatCountdown } from "./format";

const u = { d: "d", h: "h", m: "m" };
const H = 3_600_000;

describe("formatCountdown", () => {
  it("days and hours when ≥ 1 day", () => expect(formatCountdown(26 * H + 5 * 60_000, u)).toBe("1d 2h"));
  it("hours and minutes when ≥ 1 hour", () => expect(formatCountdown(3 * H + 12 * 60_000, u)).toBe("3h 12m"));
  it("minutes only, rounded up, never 0", () => {
    expect(formatCountdown(61_000, u)).toBe("2m");
    expect(formatCountdown(500, u)).toBe("1m");
  });
  it("uses localized units", () => expect(formatCountdown(26 * H, { d: "g", h: "h", m: "m" })).toBe("1g 2h"));
});
```

Run: `pnpm test src/lib/format.test.ts`
Expected: FAIL, because the module cannot be found.

- [ ] **Step 2: Implement `format.ts` and `use-now.ts`**

```ts
// src/lib/format.ts
export function formatCountdown(ms: number, units: { d: string; h: string; m: string }): string {
  const totalMin = Math.max(1, Math.ceil(ms / 60_000));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}${units.d} ${h}${units.h}`;
  if (h > 0) return `${h}${units.h} ${m}${units.m}`;
  return `${m}${units.m}`;
}
```

```ts
// src/hooks/use-now.ts
"use client";
import { useEffect, useState } from "react";

// Null until mounted so server and client markup match.
export function useNow(intervalMs = 30_000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
```

Run: `pnpm test src/lib/format.test.ts`
Expected: PASS.

- [ ] **Step 3: Set the theme tokens in `src/app/globals.css`**

Keep everything shadcn generated. Make three changes.

**(a)** In the `:root { ... }` block, replace the values of these variables with the light theme:

```css
  --background: oklch(0.98 0.005 85);
  --foreground: oklch(0.2 0.03 265);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.2 0.03 265);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.2 0.03 265);
  --primary: oklch(0.75 0.14 80);
  --primary-foreground: oklch(0.18 0.03 265);
  --secondary: oklch(0.94 0.01 265);
  --secondary-foreground: oklch(0.2 0.03 265);
  --muted: oklch(0.94 0.01 265);
  --muted-foreground: oklch(0.45 0.02 265);
  --accent: oklch(0.94 0.02 85);
  --accent-foreground: oklch(0.2 0.03 265);
  --border: oklch(0.88 0.01 265);
  --input: oklch(0.88 0.01 265);
  --ring: oklch(0.75 0.14 80);
```

**(b)** In the `.dark { ... }` block, replace the same variables with the dark theme:

```css
  --background: oklch(0.17 0.03 265);
  --foreground: oklch(0.95 0.01 85);
  --card: oklch(0.21 0.035 265);
  --card-foreground: oklch(0.95 0.01 85);
  --popover: oklch(0.21 0.035 265);
  --popover-foreground: oklch(0.95 0.01 85);
  --primary: oklch(0.8 0.13 85);
  --primary-foreground: oklch(0.18 0.03 265);
  --secondary: oklch(0.26 0.03 265);
  --secondary-foreground: oklch(0.95 0.01 85);
  --muted: oklch(0.26 0.03 265);
  --muted-foreground: oklch(0.72 0.02 265);
  --accent: oklch(0.3 0.04 265);
  --accent-foreground: oklch(0.95 0.01 85);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.8 0.13 85);
```

**(c)** Append the accent override and the font tokens at the end of the file:

```css
[data-accent="asmodian"] {
  --primary: oklch(0.7 0.17 300);
  --ring: oklch(0.7 0.17 300);
}
.dark[data-accent="asmodian"] {
  --primary: oklch(0.74 0.15 300);
  --ring: oklch(0.74 0.15 300);
}

@theme inline {
  --font-sans: var(--font-inter);
  --font-display: var(--font-cinzel);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

If shadcn's `@theme inline` block already declares `--font-sans`, edit that line rather than adding a second one.

- [ ] **Step 4: Create the locale layout and a placeholder home page**

```tsx
// src/app/[locale]/layout.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inter, Cinzel } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { AppShell } from "@/components/shell/app-shell";
import { StoreHydrator } from "@/components/store-hydrator";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel", weight: ["600", "700"] });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: { default: t("title"), template: `%s · ${t("title")}` }, description: t("description") };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    // Dark is the default; StoreHydrator switches to the stored preference after mount.
    <html lang={locale} className={`dark ${inter.variable} ${cinzel.variable}`} data-accent="elyos" suppressHydrationWarning>
      <body className="bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider>
          <TooltipProvider>
            <StoreHydrator />
            <AppShell>{children}</AppShell>
            <Toaster />
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

```tsx
// src/app/[locale]/page.tsx  (placeholder; replaced in Task 11)
import { setRequestLocale } from "next-intl/server";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return null;
}
```

If `src/components/ui/sonner.tsx` imports `next-themes`, replace its `useTheme()` usage with `const theme = "system"`. This app does not use next-themes, and the Toaster follows the `.dark` class through CSS variables.

- [ ] **Step 5: Create the store hydrator, which handles reset ticks, the theme and the corrupt-data toast**

```tsx
// src/components/store-hydrator.tsx
"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useUserStore } from "@/store/user-store";

export function StoreHydrator() {
  const t = useTranslations("settings.data");
  const theme = useUserStore((s) => s.data.settings.theme);
  const accent = useUserStore((s) => s.data.settings.accent);
  const hydrated = useUserStore((s) => s.hydrated);

  useEffect(() => {
    const store = useUserStore.getState();
    if (!store.hydrated) store.hydrate();
    if (useUserStore.getState().corrupted) toast.error(t("corrupted"));
    const id = setInterval(() => useUserStore.getState().tickResets(), 60_000);
    return () => clearInterval(id);
  }, [t]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.accent = accent;
  }, [hydrated, theme, accent]);

  return null;
}
```

- [ ] **Step 6: Create the shell components**

```ts
// src/components/shell/nav-items.ts
import { Home, ListChecks, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", key: "home", icon: Home },
  { href: "/checklist", key: "checklist", icon: ListChecks },
  { href: "/settings", key: "settings", icon: Settings },
] as const;
```

```tsx
// src/components/shell/sidebar.tsx
"use client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-border bg-card/40 p-4 md:flex">
      <Link href="/" className="font-display text-xl font-bold tracking-wide text-primary">AionTools</Link>
      <nav aria-label={t("label")} className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, key, icon: Icon }) => (
          <Link
            key={key}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              pathname === href && "bg-accent text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {t(key)}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

```tsx
// src/components/shell/bottom-nav.tsx
"use client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-border bg-card/95 backdrop-blur md:hidden">
      {NAV_ITEMS.map(({ href, key, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-xs text-muted-foreground", pathname === href && "text-primary")}
        >
          <Icon className="size-5" aria-hidden />
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}
```

```tsx
// src/components/shell/reset-countdown.tsx
"use client";
import { useTranslations } from "next-intl";
import { useNow } from "@/hooks/use-now";
import { useUserStore } from "@/store/user-store";
import { nextResetAt, type ResetPeriod } from "@/lib/reset";
import { formatCountdown } from "@/lib/format";
import { cn } from "@/lib/utils";

export function useResetCountdown(period: ResetPeriod): string | null {
  const t = useTranslations("reset.units");
  const now = useNow();
  const region = useUserStore((s) => s.data.settings.region);
  if (!now) return null;
  return formatCountdown(nextResetAt(now, region, period).getTime() - now.getTime(), { d: t("d"), h: t("h"), m: t("m") });
}

export function ResetCountdown({ period, variant = "compact" }: { period: ResetPeriod; variant?: "compact" | "large" }) {
  const t = useTranslations("reset");
  const value = useResetCountdown(period);
  return (
    <div className={cn("flex flex-col", variant === "large" && "rounded-lg border border-border bg-card p-4")}>
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{t(period === "day" ? "daily" : "weekly")}</span>
      <span className={cn("font-mono tabular-nums text-primary", variant === "large" ? "text-3xl" : "text-sm")}>{value ?? "—"}</span>
    </div>
  );
}
```

```tsx
// src/components/shell/locale-switch.tsx
"use client";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export function LocaleSwitch() {
  const t = useTranslations("locale");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const other = routing.locales.find((l) => l !== locale)!;
  return (
    <Button variant="ghost" size="sm" className="min-h-11 min-w-11 uppercase" aria-label={`${t("label")}: ${t(other)}`} onClick={() => router.replace(pathname, { locale: other })}>
      {other}
    </Button>
  );
}
```

```tsx
// src/components/shell/theme-toggle.tsx
"use client";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user-store";
import { setSettings } from "@/lib/user-data";

export function ThemeToggle() {
  const t = useTranslations("theme");
  const theme = useUserStore((s) => s.data.settings.theme);
  const update = useUserStore((s) => s.update);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="min-h-11 min-w-11"
      aria-label={t("toggle")}
      onClick={() => update((d) => setSettings(d, { theme: theme === "dark" ? "light" : "dark" }))}
    >
      {theme === "dark" ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </Button>
  );
}
```

```tsx
// src/components/shell/top-bar.tsx
import { ResetCountdown } from "./reset-countdown";
import { LocaleSwitch } from "./locale-switch";
import { ThemeToggle } from "./theme-toggle";
import { Link } from "@/i18n/navigation";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-background/90 px-4 py-2 backdrop-blur md:px-8">
      <Link href="/" className="font-display text-lg font-bold text-primary md:hidden">AionTools</Link>
      <div className="flex items-center gap-4">
        <ResetCountdown period="day" />
        <ResetCountdown period="week" />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <LocaleSwitch />
        <ThemeToggle />
      </div>
    </header>
  );
}
```

```tsx
// src/components/shell/footer.tsx
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  return <footer className="px-4 py-6 text-xs text-muted-foreground md:px-8">{t("credits")}</footer>;
}
```

```tsx
// src/components/shell/app-shell.tsx
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { TopBar } from "./top-bar";
import { Footer } from "./footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[14rem_1fr]">
      <Sidebar />
      <div className="flex min-h-dvh min-w-0 flex-col">
        <TopBar />
        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">{children}</main>
        <Footer />
      </div>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 7: Verify**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: every command exits 0, and the build output lists `/en` and `/it`.

Then run `pnpm dev`, open http://localhost:3000, and check all of the following:
- The page redirects to `/en`.
- The dark background and the gold logo appear.
- Both countdowns tick.
- Switching to IT changes the URL to `/it` and shows the Italian labels.
- The theme toggle switches to light.
- At a 375 px width the bottom nav is visible and the sidebar is hidden.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add themed app shell with reset countdowns and locale switch

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Checklist page

**Files:**
- Create: `src/components/checklist/checklist-cell.tsx`, `src/components/checklist/progress-ring.tsx`, `src/components/checklist/checklist-view.tsx`, `src/app/[locale]/checklist/page.tsx`
- Test: `src/components/checklist/checklist-cell.test.tsx`

**Interfaces:**
- Consumes: `ACTIVITIES`, `SECTIONS`, `maxFor`, `resetPeriod`, `localize`, `getCount`, `setCount`, `progressFor`, `useUserStore` and `useResetCountdown`
- Produces:
  - `<ChecklistCell activity: string; character: string; count: number; max: number; onChange(count: number): void />`
  - `<ProgressRing value: number (0..1); label: string; size?: number />`
  - `<ChecklistView />`

- [ ] **Step 1: Write the failing cell test**

```tsx
// src/components/checklist/checklist-cell.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/en.json";
import { ChecklistCell } from "./checklist-cell";

const renderCell = (props: Partial<React.ComponentProps<typeof ChecklistCell>> = {}) => {
  const onChange = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ChecklistCell activity="Daily Dungeon" character="Aria" count={2} max={14} onChange={onChange} {...props} />
    </NextIntlClientProvider>,
  );
  return onChange;
};

describe("ChecklistCell", () => {
  it("counter: click increments, shift-click and minus decrement", async () => {
    const user = userEvent.setup(); // one instance so the held Shift carries over to the click
    const onChange = renderCell();
    const btn = screen.getByRole("button", { name: "Daily Dungeon, Aria: 2 of 14" });
    expect(btn).toHaveTextContent("2/14");
    await user.click(btn);
    expect(onChange).toHaveBeenLastCalledWith(3);
    await user.keyboard("{Shift>}");
    await user.click(btn);
    await user.keyboard("{/Shift}");
    expect(onChange).toHaveBeenLastCalledWith(1);
    onChange.mockClear();
    await user.click(screen.getByRole("button", { name: "Remove one from Daily Dungeon" }));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("max 1 renders a checkbox", async () => {
    const user = userEvent.setup();
    const onChange = renderCell({ max: 1, count: 0 });
    await user.click(screen.getByRole("checkbox", { name: "Daily Dungeon, Aria: 0 of 1" }));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("max 0 renders disabled n/a", () => {
    renderCell({ max: 0, count: 0 });
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByLabelText("Not available for alts")).toBeInTheDocument();
  });
});
```

Run: `pnpm test src/components/checklist`
Expected: FAIL, because the module cannot be found.

- [ ] **Step 2: Implement the cell and the progress ring**

```tsx
// src/components/checklist/checklist-cell.tsx
"use client";
import { Minus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type Props = { activity: string; character: string; count: number; max: number; onChange(count: number): void };

export function ChecklistCell({ activity, character, count, max, onChange }: Props) {
  const t = useTranslations("checklist");
  if (max === 0) {
    return <span aria-label={t("notApplicable")} title={t("notApplicable")} className="block text-center text-muted-foreground/40">—</span>;
  }
  const label = t("cellLabel", { activity, character, count, max });
  if (max === 1) {
    return (
      <div className="flex min-h-11 items-center justify-center">
        <Checkbox aria-label={label} checked={count >= 1} onCheckedChange={(v) => onChange(v === true ? 1 : 0)} className="size-5" />
      </div>
    );
  }
  const done = count >= max;
  return (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        aria-label={t("decrement", { activity })}
        disabled={count === 0}
        onClick={() => onChange(count - 1)}
        className="flex size-8 items-center justify-center rounded text-muted-foreground hover:bg-accent disabled:opacity-30"
      >
        <Minus className="size-3" aria-hidden />
      </button>
      <button
        type="button"
        aria-label={label}
        onClick={(e) => onChange(e.shiftKey ? count - 1 : count + 1)}
        className={cn(
          "min-h-11 min-w-16 rounded-md border px-2 font-mono text-sm tabular-nums transition-colors",
          done ? "border-primary bg-primary/15 text-primary" : "border-border hover:border-primary/60",
        )}
      >
        {count}/{max}
      </button>
    </div>
  );
}
```

```tsx
// src/components/checklist/progress-ring.tsx
export function ProgressRing({ value, label, size = 36 }: { value: number; label: string; size?: number }) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, value));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="3" className="stroke-muted" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - v)}
        className="stroke-primary transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  );
}
```

Run: `pnpm test src/components/checklist`
Expected: PASS.

- [ ] **Step 3: Implement the checklist view**

On desktop it renders a matrix; on mobile it renders tabs.

```tsx
// src/components/checklist/checklist-view.tsx
"use client";
import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useUserStore } from "@/store/user-store";
import { ACTIVITIES, SECTIONS, maxFor, localize, type Activity, type Section } from "@/lib/activities";
import { getCount, setCount, progressFor } from "@/lib/checklist";
import { useResetCountdown } from "@/components/shell/reset-countdown";
import { ChecklistCell } from "./checklist-cell";
import { ProgressRing } from "./progress-ring";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function ActivityName({ a }: { a: Activity }) {
  const t = useTranslations("checklist");
  const locale = useLocale();
  const lines = [
    a.note && localize(a.note, locale),
    "cap" in a.limit && (a.limit.capSub ? t("capSub", { cap: a.limit.cap, capSub: a.limit.capSub }) : t("cap", { cap: a.limit.cap })),
  ].filter(Boolean);
  if (!lines.length) return <span>{a.name}</span>;
  return (
    <Tooltip>
      <TooltipTrigger className="cursor-help text-left underline decoration-dotted underline-offset-4">{a.name}</TooltipTrigger>
      <TooltipContent className="max-w-xs">{lines.map((l) => <p key={l as string}>{l}</p>)}</TooltipContent>
    </Tooltip>
  );
}

function SectionHeader({ section }: { section: Section }) {
  const t = useTranslations("checklist");
  const time = useResetCountdown(section === "weekly" ? "week" : "day");
  return (
    <CollapsibleTrigger className="group flex w-full min-h-11 items-center gap-3 text-left">
      <ChevronDown className="size-4 transition-transform group-data-[state=closed]:-rotate-90" aria-hidden />
      <h2 className="font-display text-lg font-semibold">{t(`sections.${section}`)}</h2>
      <span className="ml-auto text-xs text-muted-foreground">{time && t("resetsIn", { time })}</span>
    </CollapsibleTrigger>
  );
}

export function ChecklistView() {
  const t = useTranslations("checklist");
  const tHome = useTranslations("home");
  const { data, hydrated, update } = useUserStore();

  if (!hydrated) return <div className="h-64 animate-pulse rounded-lg bg-card" />;
  if (!data.characters.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="mb-4 text-muted-foreground">{t("noCharacters")}</p>
        <Link href="/settings" className={buttonVariants()}>{t("goToSettings")}</Link>
      </div>
    );
  }

  const bySection = (s: Section) => ACTIVITIES.filter((a) => a.section === s);
  const change = (charId: string, a: Activity) => (count: number) => update((d) => setCount(d, charId, a, count));

  return (
    <>
      {/* Desktop: matrix */}
      <div className="hidden space-y-6 md:block">
        {SECTIONS.map((section) => (
          <Collapsible key={section} defaultOpen className="rounded-lg border border-border bg-card p-4">
            <SectionHeader section={section} />
            <CollapsibleContent className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground">
                    <th scope="col" className="py-2 text-left font-normal">{t("activity")}</th>
                    {data.characters.map((c) => {
                      const p = progressFor(data, c.id, ACTIVITIES, [section]);
                      return (
                        <th key={c.id} scope="col" className="px-2 py-2 font-normal">
                          <div className="flex flex-col items-center gap-1">
                            <ProgressRing value={p.total ? p.done / p.total : 0} label={t("progressLabel", p)} size={28} />
                            <span className="text-foreground">{c.name}</span>
                            {c.isMain && <Badge variant="secondary">{tHome("main")}</Badge>}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {bySection(section).map((a) => (
                    <tr key={a.id} className="border-t border-border/60">
                      <th scope="row" className="py-1 pr-4 text-left font-normal"><ActivityName a={a} /></th>
                      {data.characters.map((c) => (
                        <td key={c.id} className="px-2 py-1">
                          <ChecklistCell activity={a.name} character={c.name} count={getCount(data, c.id, a)} max={maxFor(a, c.isMain)} onChange={change(c.id, a)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {/* Mobile: one tab per character */}
      <Tabs defaultValue={data.characters[0].id} className="md:hidden">
        <TabsList className="w-full overflow-x-auto">
          {data.characters.map((c) => <TabsTrigger key={c.id} value={c.id} className="min-h-11">{c.name}</TabsTrigger>)}
        </TabsList>
        {data.characters.map((c) => (
          <TabsContent key={c.id} value={c.id} className="space-y-4">
            {SECTIONS.map((section) => (
              <Collapsible key={section} defaultOpen className="rounded-lg border border-border bg-card p-3">
                <SectionHeader section={section} />
                <CollapsibleContent>
                  <ul className="mt-2 divide-y divide-border/60">
                    {bySection(section).map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 py-1">
                        <ActivityName a={a} />
                        <ChecklistCell activity={a.name} character={c.name} count={getCount(data, c.id, a)} max={maxFor(a, c.isMain)} onChange={change(c.id, a)} />
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
```

- [ ] **Step 4: Create the page**

```tsx
// src/app/[locale]/checklist/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChecklistView } from "@/components/checklist/checklist-view";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checklist" });
  return { title: t("title") };
}

export default async function ChecklistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("checklist");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
      <ChecklistView />
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: every command exits 0.

Then use `pnpm dev`. Add a character temporarily from the browser console:

```js
localStorage.setItem('aiontools:user-data', JSON.stringify({ ...JSON.parse(localStorage.getItem('aiontools:user-data')), characters: [{ id: 'm', name: 'Main', classId: 'chanter', isMain: true }, { id: 'a', name: 'Alt', classId: 'cleric', isMain: false }] }))
```

Reload `/en/checklist` and check that:
- The matrix renders.
- Main-only cells show "—" for the alt.
- Counters increment, shift-click decrements, and progress rings move.
- At 375 px wide the page switches to tabs.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add checklist page with matrix and mobile views

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Settings page and onboarding

**Files:**
- Create:
  - `src/components/settings/region-select.tsx`
  - `src/components/settings/characters-editor.tsx`
  - `src/components/settings/appearance-settings.tsx`
  - `src/components/settings/data-transfer.tsx`
  - `src/components/onboarding-dialog.tsx`
  - `src/app/[locale]/settings/page.tsx`
- Modify: `src/app/[locale]/layout.tsx`, to mount `<OnboardingDialog />`

**Interfaces:**
- Consumes: `useUserStore`, `setSettings`, `parseImported`, `addCharacter`, `removeCharacter`, `setMain`, `updateCharacter`, `MAX_CHARACTERS`, `CLASSES`, `DEFAULT_CLASS_ID` and `REGION_IDS`
- Produces: `<RegionSelect />`, `<CharactersEditor />`, `<AppearanceSettings />`, `<DataTransfer />` and `<OnboardingDialog />`

- [ ] **Step 1: Create the region select**

```tsx
// src/components/settings/region-select.tsx
"use client";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserStore } from "@/store/user-store";
import { setSettings } from "@/lib/user-data";
import { REGION_IDS, type RegionId } from "@/lib/regions";

export function RegionSelect() {
  const t = useTranslations("settings.region");
  const region = useUserStore((s) => s.data.settings.region);
  const update = useUserStore((s) => s.update);
  return (
    <div className="grid max-w-xs gap-2">
      <Label htmlFor="region">{t("label")}</Label>
      <Select value={region} onValueChange={(v) => update((d) => setSettings(d, { region: v as RegionId }))}>
        <SelectTrigger id="region" className="min-h-11"><SelectValue /></SelectTrigger>
        <SelectContent>
          {REGION_IDS.map((r) => <SelectItem key={r} value={r}>{t(r)}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 2: Create the characters editor**

```tsx
// src/components/settings/characters-editor.tsx
"use client";
import { useState } from "react";
import { Crown, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserStore } from "@/store/user-store";
import { addCharacter, removeCharacter, setMain, updateCharacter, MAX_CHARACTERS } from "@/lib/characters";
import { CLASSES, DEFAULT_CLASS_ID } from "@/lib/classes";

function ClassSelect({ id, value, onChange }: { id: string; value: string; onChange(v: string): void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="min-h-11 w-40"><SelectValue /></SelectTrigger>
      <SelectContent>{CLASSES.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export function CharactersEditor() {
  const t = useTranslations("settings.characters");
  const characters = useUserStore((s) => s.data.characters);
  const update = useUserStore((s) => s.update);
  const [name, setName] = useState("");
  const [classId, setClassId] = useState<string>(DEFAULT_CLASS_ID);
  const full = characters.length >= MAX_CHARACTERS;

  return (
    <div className="space-y-4">
      {characters.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
      <ul className="space-y-2">
        {characters.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-2">
            <Input
              key={c.name}
              aria-label={`${t("name")}: ${c.name}`}
              defaultValue={c.name}
              maxLength={32}
              className="min-h-11 w-48"
              onBlur={(e) => {
                update((d) => updateCharacter(d, c.id, { name: e.target.value }));
                if (!e.target.value.trim()) e.target.value = c.name;
              }}
            />
            <ClassSelect id={`class-${c.id}`} value={c.classId} onChange={(v) => update((d) => updateCharacter(d, c.id, { classId: v }))} />
            {c.isMain ? (
              <Badge>{t("main")}</Badge>
            ) : (
              <Button variant="ghost" size="sm" className="min-h-11" onClick={() => update((d) => setMain(d, c.id))}>
                <Crown className="size-4" aria-hidden />
                {t("makeMain")}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label={t("remove", { name: c.name })} onClick={() => update((d) => removeCharacter(d, c.id))}>
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          update((d) => addCharacter(d, { name, classId }));
          setName("");
        }}
      >
        <div className="grid gap-1">
          <Label htmlFor="new-name">{t("name")}</Label>
          <Input id="new-name" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} className="min-h-11 w-48" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="new-class">{t("class")}</Label>
          <ClassSelect id="new-class" value={classId} onChange={setClassId} />
        </div>
        <Button type="submit" className="min-h-11" disabled={full || !name.trim()}>{t("add")}</Button>
      </form>
      <p className="text-xs text-muted-foreground">{t("limit")}</p>
    </div>
  );
}
```

- [ ] **Step 3: Create the appearance settings and data transfer components**

```tsx
// src/components/settings/appearance-settings.tsx
"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user-store";
import { setSettings, type UserData } from "@/lib/user-data";

type S = UserData["settings"];

export function AppearanceSettings() {
  const t = useTranslations("settings.appearance");
  const settings = useUserStore((s) => s.data.settings);
  const update = useUserStore((s) => s.update);
  const group = <K extends "theme" | "accent">(key: K, options: S[K][]) => (
    <div role="group" aria-label={t(key)} className="flex gap-2">
      {options.map((o) => (
        <Button key={o} variant={settings[key] === o ? "default" : "outline"} aria-pressed={settings[key] === o} className="min-h-11" onClick={() => update((d) => setSettings(d, { [key]: o }))}>
          {t(o)}
        </Button>
      ))}
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="space-y-2"><p className="text-sm font-medium">{t("theme")}</p>{group("theme", ["dark", "light"])}</div>
      <div className="space-y-2"><p className="text-sm font-medium">{t("accent")}</p>{group("accent", ["elyos", "asmodian"])}</div>
    </div>
  );
}
```

```tsx
// src/components/settings/data-transfer.tsx
"use client";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user-store";
import { parseImported } from "@/lib/user-data";

export function DataTransfer() {
  const t = useTranslations("settings.data");
  const fileRef = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(useUserStore.getState().data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `aiontools-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (file: File) => {
    const data = parseImported(await file.text());
    if (!data) return toast.error(t("importError"));
    useUserStore.getState().update(() => data);
    useUserStore.getState().tickResets();
    toast.success(t("importDone"));
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="min-h-11" onClick={exportData}>{t("export")}</Button>
        <Button variant="outline" className="min-h-11" onClick={() => fileRef.current?.click()}>{t("import")}</Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importData(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create the settings page**

```tsx
// src/app/[locale]/settings/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegionSelect } from "@/components/settings/region-select";
import { CharactersEditor } from "@/components/settings/characters-editor";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { DataTransfer } from "@/components/settings/data-transfer";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });
  return { title: t("title") };
}

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("settings");
  const section = (title: string, body: React.ReactNode) => (
    <Card>
      <CardHeader><CardTitle className="font-display">{title}</CardTitle></CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
      {section(t("characters.title"), <CharactersEditor />)}
      {section(t("region.title"), <RegionSelect />)}
      {section(t("appearance.title"), <AppearanceSettings />)}
      {section(t("data.title"), <DataTransfer />)}
    </div>
  );
}
```

- [ ] **Step 5: Create the onboarding dialog and mount it**

```tsx
// src/components/onboarding-dialog.tsx
"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user-store";
import { setSettings } from "@/lib/user-data";
import { RegionSelect } from "@/components/settings/region-select";
import { CharactersEditor } from "@/components/settings/characters-editor";

export function OnboardingDialog() {
  const t = useTranslations("onboarding");
  const open = useUserStore((s) => s.hydrated && !s.data.settings.onboarded);
  const update = useUserStore((s) => s.update);
  const [step, setStep] = useState<0 | 1>(0);
  const finish = () => update((d) => setSettings(d, { onboarded: true }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && finish()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t("title")}</DialogTitle>
          <DialogDescription>{step === 0 ? t("regionStep") : t("charactersStep")}</DialogDescription>
        </DialogHeader>
        {step === 0 ? <RegionSelect /> : <CharactersEditor />}
        <DialogFooter className="gap-2">
          <Button variant="ghost" className="min-h-11" onClick={finish}>{t("skip")}</Button>
          {step === 0 ? (
            <Button className="min-h-11" onClick={() => setStep(1)}>{t("next")}</Button>
          ) : (
            <Button className="min-h-11" onClick={finish}>{t("done")}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

In `src/app/[locale]/layout.tsx`, import it and render `<OnboardingDialog />` right after `<StoreHydrator />`:

```tsx
import { OnboardingDialog } from "@/components/onboarding-dialog";
// ...
            <StoreHydrator />
            <OnboardingDialog />
```

- [ ] **Step 6: Verify**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: every command exits 0.

Then manually, with `pnpm dev`, run `localStorage.clear()` and reload `/it`, and check that:
- The Italian onboarding appears.
- The region and characters steps both work.
- After "Fatto" the dialog does not come back on reload.
- In Settings you can rename a character (clearing the name reverts it on blur), make an alt the main, and remove a character.
- Export downloads a file, and importing that file back shows "Dati importati".
- Importing a random `.json` file shows the error toast and leaves the data unchanged.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add settings page and first-visit onboarding

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Home dashboard

**Files:**
- Create: `src/components/home/home-dashboard.tsx`
- Modify: `src/app/[locale]/page.tsx`, replacing the placeholder

**Interfaces:**
- Consumes: `useUserStore`, `progressFor`, `ACTIVITIES`, `ProgressRing`, `ResetCountdown` and `className`
- Produces: the `/[locale]` home page

- [ ] **Step 1: Implement the dashboard**

```tsx
// src/components/home/home-dashboard.tsx
"use client";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/user-store";
import { ACTIVITIES, type Section } from "@/lib/activities";
import { progressFor } from "@/lib/checklist";
import { className } from "@/lib/classes";
import { ProgressRing } from "@/components/checklist/progress-ring";
import { ResetCountdown } from "@/components/shell/reset-countdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const ROWS: Section[] = ["daily", "weekly", "recharge"];

export function HomeDashboard() {
  const t = useTranslations("home");
  const tc = useTranslations("checklist");
  const { data, hydrated } = useUserStore();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <ResetCountdown period="day" variant="large" />
        <ResetCountdown period="week" variant="large" />
      </div>

      {!hydrated ? (
        <div className="h-40 animate-pulse rounded-lg bg-card" />
      ) : data.characters.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="mb-4 text-muted-foreground">{t("noCharacters")}</p>
          <Link href="/settings" className={buttonVariants()}>{t("addCharacters")}</Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.characters.map((c) => (
              <Card key={c.id} className="transition-shadow hover:shadow-[0_0_24px_-8px_var(--primary)]">
                <CardHeader className="flex-row items-center justify-between gap-2">
                  <CardTitle className="font-display">{c.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{className(c.classId)}</span>
                    {c.isMain && <Badge>{t("main")}</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-2">
                  {ROWS.map((s) => {
                    const p = progressFor(data, c.id, ACTIVITIES, [s]);
                    return (
                      <div key={s} className="flex flex-col items-center gap-1 text-center">
                        <ProgressRing value={p.total ? p.done / p.total : 0} label={`${tc(`sections.${s}`)}: ${tc("progressLabel", p)}`} size={48} />
                        <span className="text-xs text-muted-foreground">{tc(`sections.${s}`)}</span>
                        <span className="font-mono text-xs tabular-nums">{p.done}/{p.total}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
          <Link href="/checklist" className={buttonVariants({ size: "lg", className: "min-h-11" })}>{t("openChecklist")}</Link>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace the home page**

```tsx
// src/app/[locale]/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HomeDashboard } from "@/components/home/home-dashboard";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
      <HomeDashboard />
    </div>
  );
}
```

- [ ] **Step 3: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: every command exits 0.

Then check manually that the home page shows the large countdowns and one card per character, and that the rings update after you tick items in the checklist.

```bash
git add -A
git commit -m "feat: add home dashboard with per-character progress

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: End-to-end tests and deploy

**Files:**
- Create: `playwright.config.ts`, `e2e/checklist.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: the whole app. The accessible names come from `messages/en.json`.

- [ ] **Step 1: Create the Playwright config**

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:3000" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000/en",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

- [ ] **Step 2: Write the E2E specs**

```ts
// e2e/checklist.spec.ts
import { test, expect } from "@playwright/test";

test("onboarding → tick checklist → state survives reload", async ({ page }) => {
  await page.goto("/en");
  const dialog = page.getByRole("dialog", { name: "Welcome to AionTools" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Next" }).click();
  await dialog.getByLabel("Name", { exact: true }).fill("Aria");
  await dialog.getByRole("button", { name: "Add character" }).click();
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();

  await page.goto("/en/checklist");
  await page.getByRole("button", { name: "Duty Missions, Aria: 0 of 5" }).click();
  await expect(page.getByRole("button", { name: "Duty Missions, Aria: 1 of 5" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Duty Missions, Aria: 1 of 5" })).toBeVisible();
});

test("corrupt saved data is backed up and the app still loads", async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("aiontools:user-data", "{bad");
      sessionStorage.setItem("seeded", "1");
    }
  });
  await page.goto("/en");
  await expect(page.getByText("Saved data was unreadable.")).toBeVisible();
  const backups = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("aiontools-backup-")));
  expect(backups).toHaveLength(1);
});
```

- [ ] **Step 3: Run the E2E tests**

```bash
pnpm exec playwright install chromium
pnpm e2e
```

Expected: 2 passed.

If the name `Name` matches more than one element, scope it to the add form with `dialog.locator("#new-name")`.

- [ ] **Step 4: Update `README.md`**

Write:

```markdown
# AionTools

Aion 2 tools — daily/weekly checklist (main + 8 alts, automatic resets), with builds, crafting and guides coming next. IT/EN, no login.

## Develop

    pnpm install
    pnpm dev          # http://localhost:3000
    pnpm test         # unit tests
    pnpm e2e          # Playwright end-to-end

## Content

`content/activities.json` is hand-curated from the community sheets. Reset rules are in `src/lib/regions.ts`.

## Credits

Data from community spreadsheets by Castform and others. Fan-made, not affiliated with NCSoft.
```

- [ ] **Step 5: Verify the whole suite and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e`
Expected: every command exits 0.

```bash
git add -A
git commit -m "test: add e2e coverage for checklist persistence and corrupt storage

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Deploy (the user does this; it is an outward-facing action)**

Ask the user before doing any of the following:
1. Push the branch, `git push -u origin feat/plan1-foundation-checklist`, and open a PR into `main`. The CI should go green.
2. In the Vercel dashboard, use Add New → Project, import `davidesidoti/aiontools`, keep the Next.js preset, and deploy. No env vars are needed until plan 2.
3. Merge the PR, which deploys to production. Then smoke-test production: `/` redirects to a locale, onboarding works, and the checklist persists.
