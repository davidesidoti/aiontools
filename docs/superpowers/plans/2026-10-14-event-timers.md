# Event Timers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show countdowns to recurring game events (Spacetime Rift, Shugo Festival, Dimensional Invasion, Artifact Siege, Guardian Lord Nahma) in the top bar and on Home, computed in the player's server time zone.

**Architecture:**
- A curated `content/events.json` holds schedule rules per region.
- `src/lib/events.ts` turns a rule into the next start with `Intl`-based time-zone math, DST included.
- A new `settings.server` field (EU / NA East / NA West) picks the Global server's IANA zone.
- Client components reuse `useNow` and `formatCountdown`.

**Tech Stack:** Next.js 16, next-intl 4, Zod 4, Zustand, Vitest + Testing Library, Playwright. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-14-event-timers-design.md` (extends `docs/superpowers/specs/2026-10-13-aiontools-design.md`).

## Global Constraints

- Resets keep their current logic (`src/lib/reset.ts`, fixed UTC). Only events use time zones.
- Time zones:

| Server | Zone |
|---|---|
| `eu` | Europe/Berlin |
| `na-east` | America/New_York |
| `na-west` | America/Los_Angeles |
| `kr` | Asia/Seoul |
| `tw` | Asia/Taipei |

- `settings.server` is `z.enum(["eu","na-east","na-west"]).default("eu")`. `USER_DATA_VERSION` stays 1.
- **DST rules:** a local time inside the spring-forward gap shifts forward by the gap (02:30 → 03:30). A repeated autumn hour takes its first instance.
- An event is open when `start <= now < start + durationMin`. While it is open, the countdown reads "Open · Nm", with the minutes left in the window.
- Top bar: Rift and Shugo from `lg` up, after the two reset countdowns. Phones see events only on Home.
- Every new string goes in EN and IT. Event names stay in English.
- Times are community-sourced, so the UI shows "Community times, checked <date>" with the source links.
- **Ruling carried from the spec:** use the existing `setSettings(d, { server })` instead of a new `setServer` function, because it already does exactly this. Cost if wrong: none.
- Commits use `git -c user.name="Davide Sidoti" -c user.email="sidotidavide@gmail.com" commit …` and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **The countdown must be right across the 2026-10-25 EU and 2026-11-01 US clock changes**, including the repeated hour. Task 1 has unit tests.
2. **The minute an event window ends, it must switch to the next start, not show "Open · 0m".** Task 1 has a unit test.
3. **Stored or synced data without `server` must keep loading as EU.** It must not be flagged as corrupt. Task 2 has a unit test.
4. **Switching the server must change the times shown on Home.** Task 4 has an e2e test, which checks the Siege row: Rift lands on the same UTC instants for EU and NA in summer.
5. **The top bar must not overflow at widths where the new countdowns show.** They are hidden below `lg`, and the 375 px test stays green. Task 4 has an e2e test.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/regions.ts` | Adds `SERVER_IDS`, `ServerId`, `eventTimeZone`. |
| `src/lib/tz.ts` (new) | `wallClock` and `zonedInstant`: pure `Intl` time-zone math. |
| `src/lib/events.ts` (new) | Event schema and loader, `nextOccurrence`, `eventStatus`. |
| `src/lib/events.test.ts` (new) | Time-zone and rule tests. |
| `content/events.json` (new) | Curated schedules. |
| `src/lib/user-data.ts`, `src/lib/user-data.test.ts` | The `server` field. |
| `src/components/settings/region-select.tsx` | Server select for Global. |
| `src/components/shell/event-countdown.tsx` (new) | `useEventStatus`, `EventCountdown`, `NextEvents`. |
| `src/components/shell/event-countdown.test.tsx` (new) | Component tests. |
| `src/components/shell/top-bar.tsx`, `src/components/home/home-dashboard.tsx` | Wiring. |
| `messages/en.json`, `messages/it.json` | New strings. |
| `content/guides/roadmap.json` | The "EST" fix. |
| `e2e/events.spec.ts` (new) | Top bar, server switch, overflow. |

---

### Task 1: Time-zone math, event rules and the events file

**Files:**
- Create: `src/lib/tz.ts`, `src/lib/events.ts`, `src/lib/events.test.ts`, `content/events.json`
- Modify: `src/lib/regions.ts`

**Interfaces:**
- Produces:
  - `SERVER_IDS = ["eu","na-east","na-west"] as const`, `type ServerId`, `eventTimeZone(region: RegionId, server: ServerId): string` (in `regions.ts`)
  - `wallClock(instant: number, timeZone: string): { y: number; mo: number; d: number; h: number; mi: number }`
  - `zonedInstant(y: number, mo: number, d: number, h: number, mi: number, timeZone: string): number` (in `tz.ts`)
  - `type Rule = { kind: "hourly"; minute: number } | { kind: "fixed"; days?: number[]; times: string[] }`
  - `EVENTS: GameEvent[]`, where `GameEvent = { id: EventId; name: FullText; durationMin: number; schedule: Record<RegionId, Rule> }`
  - `EVENTS_META: { checked: string; sources: { label: string; url: string }[] }`
  - `nextOccurrence(rule: Rule, timeZone: string, now: Date, durationMin: number): Date`
  - `eventStatus(event: GameEvent, region: RegionId, server: ServerId, now: Date): { start: Date; open: boolean; end: Date }` (in `events.ts`)

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/events.test.ts
import { describe, it, expect } from "vitest";
import { nextOccurrence, eventStatus, EVENTS, EVENTS_META, type Rule } from "./events";
import { zonedInstant } from "./tz";
import { eventTimeZone, REGION_IDS } from "./regions";

const RIFT: Rule = { kind: "fixed", times: ["02:00", "05:00", "08:00", "11:00", "14:00", "17:00", "20:00", "23:00"] };
const at = (iso: string) => new Date(iso);
const next = (rule: Rule, tz: string, now: string, dur = 10) => nextOccurrence(rule, tz, at(now), dur).toISOString();

describe("zonedInstant", () => {
  it("takes the first instance of the repeated autumn hour (Berlin, 2026-10-25 02:30)", () => {
    expect(new Date(zonedInstant(2026, 10, 25, 2, 30, "Europe/Berlin")).toISOString()).toBe("2026-10-25T00:30:00.000Z");
  });
  it("shifts a time inside the spring gap forward (Berlin, 2027-03-28 02:30 → 03:30 CEST)", () => {
    expect(new Date(zonedInstant(2027, 3, 28, 2, 30, "Europe/Berlin")).toISOString()).toBe("2027-03-28T01:30:00.000Z");
  });
});

describe("nextOccurrence", () => {
  it("Rift in Berlin just before the switch: the 02:00 slot is the CEST one", () => {
    expect(next(RIFT, "Europe/Berlin", "2026-10-24T22:10:00Z")).toBe("2026-10-25T00:00:00.000Z");
  });
  it("Rift in Berlin after the switch follows CET", () => {
    expect(next(RIFT, "Europe/Berlin", "2026-10-25T03:00:00Z")).toBe("2026-10-25T04:00:00.000Z");
  });
  it("Rift in New York across the US switch", () => {
    expect(next(RIFT, "America/New_York", "2026-10-31T13:00:00Z")).toBe("2026-10-31T15:00:00.000Z"); // 11:00 EDT
    expect(next(RIFT, "America/New_York", "2026-11-01T12:00:00Z")).toBe("2026-11-01T13:00:00.000Z"); // 08:00 EST
  });
  it("Rift in Seoul (no DST)", () => {
    expect(next(RIFT, "Asia/Seoul", "2026-10-14T00:00:00Z")).toBe("2026-10-14T02:00:00.000Z"); // 11:00 KST
  });
  it("an hourly rule at :30 returns the current start while still open, the next one after", () => {
    const rule: Rule = { kind: "hourly", minute: 30 };
    expect(next(rule, "Europe/Berlin", "2026-10-14T10:40:00Z", 15)).toBe("2026-10-14T10:30:00.000Z");
    expect(next(rule, "Europe/Berlin", "2026-10-14T10:40:00Z", 5)).toBe("2026-10-14T11:30:00.000Z");
  });
  it("a fixed rule with days skips to the next allowed weekday", () => {
    const siege: Rule = { kind: "fixed", days: [1, 4, 6], times: ["21:00"] };
    expect(next(siege, "Europe/Berlin", "2026-10-14T12:00:00Z", 30)).toBe("2026-10-15T19:00:00.000Z"); // Thu 21:00 CEST
  });
});

describe("eventStatus", () => {
  const siege = EVENTS.find((e) => e.id === "siege")!;
  it("is open inside the window", () => {
    const s = eventStatus(siege, "global", "eu", at("2026-10-15T19:10:00Z"));
    expect(s).toEqual({ start: at("2026-10-15T19:00:00Z"), end: at("2026-10-15T19:30:00Z"), open: true });
  });
  it("moves to the next start the minute the window ends", () => {
    const s = eventStatus(siege, "global", "eu", at("2026-10-15T19:30:00Z"));
    expect(s.open).toBe(false);
    expect(s.start.toISOString()).toBe("2026-10-17T19:00:00.000Z"); // Sat 21:00 CEST
  });
  it("uses the server's zone for Global", () => {
    expect(eventTimeZone("global", "na-west")).toBe("America/Los_Angeles");
    expect(eventTimeZone("kr", "na-west")).toBe("Asia/Seoul");
  });
});

describe("events file", () => {
  it("has the five events, each with a rule for every region", () => {
    expect(EVENTS.map((e) => e.id).sort()).toEqual(["invasion", "nahma", "rift", "shugo", "siege"]);
    for (const e of EVENTS) for (const r of REGION_IDS) expect(e.schedule[r], `${e.id}/${r}`).toBeDefined();
    expect(EVENTS_META.sources.length).toBeGreaterThan(0);
  });
});
```

Run: `pnpm test src/lib/events.test.ts`
Expected: FAIL, because `./events` does not exist.

- [ ] **Step 2: Servers in `regions.ts`**

Append to `src/lib/regions.ts`:

```ts
// Global has separate servers whose events follow their local clock; KR and TW have one each.
export const SERVER_IDS = ["eu", "na-east", "na-west"] as const;
export type ServerId = (typeof SERVER_IDS)[number];

const EVENT_TZ: Record<ServerId | Exclude<RegionId, "global">, string> = {
  eu: "Europe/Berlin",
  "na-east": "America/New_York",
  "na-west": "America/Los_Angeles",
  kr: "Asia/Seoul",
  tw: "Asia/Taipei",
};

export function eventTimeZone(region: RegionId, server: ServerId): string {
  return EVENT_TZ[region === "global" ? server : region];
}
```

- [ ] **Step 3: `src/lib/tz.ts`**

```ts
// src/lib/tz.ts
// Time-zone math with Intl only: wall clock of an instant, and the instant of a wall clock.
const HOUR = 3_600_000;
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" });
    formatters.set(timeZone, f);
  }
  return f;
}

export function wallClock(instant: number, timeZone: string) {
  const parts = formatter(timeZone).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour"), mi: get("minute") };
}

function offsetAt(instant: number, timeZone: string): number {
  const w = wallClock(instant, timeZone);
  return Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi) - Math.floor(instant / 60_000) * 60_000;
}

// Repeated autumn hour → its first instance; spring-forward gap → shifted forward by the gap.
export function zonedInstant(y: number, mo: number, d: number, h: number, mi: number, timeZone: string): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const candidates = [...new Set([offsetAt(guess - 12 * HOUR, timeZone), offsetAt(guess + 12 * HOUR, timeZone)])].map((o) => guess - o);
  const exact = candidates.filter((t) => {
    const w = wallClock(t, timeZone);
    return w.d === d && w.h === h && w.mi === mi;
  });
  return exact.length > 0 ? Math.min(...exact) : Math.max(...candidates);
}
```

- [ ] **Step 4: `content/events.json`**

```json
{
  "checked": "2026-10-14",
  "sources": [
    { "label": "shugo.gg", "url": "https://shugo.gg/timers" },
    { "label": "Aion2 Rift Timer", "url": "https://aion2rifttimer.com/" },
    { "label": "Daeva Guides", "url": "https://daevaguides.com/en/guides/timers/" },
    { "label": "Inven (KR)", "url": "https://www.inven.co.kr/board/aion2/6493/146" }
  ],
  "events": [
    {
      "id": "shugo", "name": { "en": "Shugo Festival", "it": "Shugo Festival" }, "durationMin": 10,
      "schedule": { "global": { "kind": "hourly", "minute": 0 }, "kr": { "kind": "hourly", "minute": 0 }, "tw": { "kind": "hourly", "minute": 0 } }
    },
    {
      "id": "invasion", "name": { "en": "Dimensional Invasion", "it": "Dimensional Invasion" }, "durationMin": 15,
      "schedule": { "global": { "kind": "hourly", "minute": 30 }, "kr": { "kind": "hourly", "minute": 30 }, "tw": { "kind": "hourly", "minute": 30 } }
    },
    {
      "id": "rift", "name": { "en": "Spacetime Rift", "it": "Spacetime Rift" }, "durationMin": 10,
      "schedule": {
        "global": { "kind": "fixed", "times": ["02:00", "05:00", "08:00", "11:00", "14:00", "17:00", "20:00", "23:00"] },
        "kr": { "kind": "fixed", "times": ["02:00", "05:00", "08:00", "11:00", "14:00", "17:00", "20:00", "23:00"] },
        "tw": { "kind": "fixed", "times": ["02:00", "05:00", "08:00", "11:00", "14:00", "17:00", "20:00", "23:00"] }
      }
    },
    {
      "id": "siege", "name": { "en": "Artifact Siege", "it": "Artifact Siege" }, "durationMin": 30,
      "schedule": {
        "global": { "kind": "fixed", "days": [1, 4, 6], "times": ["21:00"] },
        "kr": { "kind": "fixed", "days": [3, 6], "times": ["21:20"] },
        "tw": { "kind": "fixed", "days": [3, 6], "times": ["21:30"] }
      }
    },
    {
      "id": "nahma", "name": { "en": "Guardian Lord Nahma", "it": "Guardian Lord Nahma" }, "durationMin": 30,
      "schedule": {
        "global": { "kind": "fixed", "days": [0, 5], "times": ["21:00"] },
        "kr": { "kind": "fixed", "days": [0, 5], "times": ["22:00"] },
        "tw": { "kind": "fixed", "days": [0, 5], "times": ["22:00"] }
      }
    }
  ]
}
```

- [ ] **Step 5: `src/lib/events.ts`**

```ts
// src/lib/events.ts
import { z } from "zod";
import raw from "@content/events.json";
import { FullTextSchema } from "./text";
import { REGION_IDS, eventTimeZone, type RegionId, type ServerId } from "./regions";
import { wallClock, zonedInstant } from "./tz";

const DAY = 86_400_000;
const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const RuleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("hourly"), minute: z.number().int().min(0).max(59) }),
  z.object({ kind: z.literal("fixed"), days: z.array(z.number().int().min(0).max(6)).min(1).optional(), times: z.array(HHMM).min(1) }),
]);
const EventSchema = z.object({
  id: z.enum(["shugo", "invasion", "rift", "siege", "nahma"]),
  name: FullTextSchema,
  durationMin: z.number().int().positive(),
  schedule: z.record(z.enum(REGION_IDS), RuleSchema),
});
const FileSchema = z.object({
  checked: z.iso.date(),
  sources: z.array(z.object({ label: z.string().min(1), url: z.url() })).min(1),
  events: z.array(EventSchema).min(1),
});

export type Rule = z.infer<typeof RuleSchema>;
export type GameEvent = z.infer<typeof EventSchema>;
export type EventId = GameEvent["id"];

const FILE = FileSchema.parse(raw);
export const EVENTS: GameEvent[] = FILE.events;
export const EVENTS_META = { checked: FILE.checked, sources: FILE.sources };

function startsOn(rule: Rule, y: number, mo: number, d: number): [number, number][] {
  if (rule.kind === "hourly") return Array.from({ length: 24 }, (_, h) => [h, rule.minute]);
  const weekday = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  if (rule.days && !rule.days.includes(weekday)) return [];
  return rule.times.map((t) => t.split(":").map(Number) as [number, number]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

// First start whose window hasn't ended yet: a start that is still open counts.
export function nextOccurrence(rule: Rule, timeZone: string, now: Date, durationMin: number): Date {
  const from = now.getTime() - durationMin * 60_000;
  const base = wallClock(from, timeZone);
  for (let i = 0; i <= 8; i++) {
    const day = new Date(Date.UTC(base.y, base.mo - 1, base.d) + i * DAY);
    const [y, mo, d] = [day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate()];
    for (const [h, mi] of startsOn(rule, y, mo, d)) {
      const t = zonedInstant(y, mo, d, h, mi, timeZone);
      if (t > from) return new Date(t);
    }
  }
  throw new Error("no occurrence within 8 days"); // unreachable with a valid rule
}

export function eventStatus(event: GameEvent, region: RegionId, server: ServerId, now: Date) {
  const start = nextOccurrence(event.schedule[region], eventTimeZone(region, server), now, event.durationMin);
  const end = new Date(start.getTime() + event.durationMin * 60_000);
  return { start, end, open: start <= now };
}
```

- [ ] **Step 6: Run the tests**

Run: `pnpm test src/lib/events.test.ts`
Expected: PASS.

If the jsdom/Node ICU in use lacks a zone (very unlikely with Node 24's full ICU), stop and ledger it. Don't fake the data.

- [ ] **Step 7: Full suite and commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: everything passes.

```bash
git add src/lib/tz.ts src/lib/events.ts src/lib/events.test.ts src/lib/regions.ts content/events.json
git -c user.name="Davide Sidoti" -c user.email="sidotidavide@gmail.com" commit -m "feat: event schedules with time-zone aware next occurrence

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The `server` setting

**Files:**
- Modify: `src/lib/user-data.ts`, `src/lib/user-data.test.ts`, `src/components/settings/region-select.tsx`, `messages/en.json`, `messages/it.json`

**Interfaces:**
- Consumes: `SERVER_IDS`, `ServerId` from Task 1.
- Produces: `UserData["settings"]["server"]: ServerId`, always present after parsing.

- [ ] **Step 1: Write the failing tests**

In `src/lib/user-data.test.ts`:
- Change the `createDefaultUserData` assertion to `expect(d.settings).toEqual({ region: "global", server: "eu", accent: "elyos", onboarded: false });`.
- Append:

```ts
describe("server setting", () => {
  it("stored or synced data without a server loads as EU, not as corrupt", () => {
    const d = createDefaultUserData(now);
    const { server: _omit, ...oldSettings } = d.settings;
    const { data, corrupted } = parseStored(JSON.stringify({ ...d, settings: oldSettings }), now);
    expect(corrupted).toBe(false);
    expect(data.settings.server).toBe("eu");
  });
  it("rejects an unknown server", () => {
    const d = createDefaultUserData(now);
    expect(parseStored(JSON.stringify({ ...d, settings: { ...d.settings, server: "mars" } }), now).corrupted).toBe(true);
  });
  it("setSettings changes only the server", () => {
    const d = createDefaultUserData(now);
    expect(setSettings(d, { server: "na-west" }).settings).toEqual({ ...d.settings, server: "na-west" });
  });
});
```

Run: `pnpm test src/lib/user-data.test.ts`
Expected: FAIL, because `server` is missing.

- [ ] **Step 2: Implement**

In `src/lib/user-data.ts`:
- Import `SERVER_IDS` alongside `REGION_IDS` from `./regions`.
- In `settings`, add `server: z.enum(SERVER_IDS).default("eu"),` after `region`, with a comment: `// Added after v1 shipped: missing in older stored or synced data, hence the default.`
- In `createDefaultUserData`, change settings to `{ region: "global", server: "eu", accent: "elyos", onboarded: false }`.

Run: `pnpm test src/lib/user-data.test.ts`
Expected: PASS.

If the destructuring of `_omit` trips the lint `no-unused-vars` rule, use `const oldSettings = { region: d.settings.region, accent: d.settings.accent, onboarded: d.settings.onboarded };` instead.

- [ ] **Step 3: Server select (Global only)**

Messages. In `settings.region`, add:

| Key | EN | IT |
|---|---|---|
| `server` | Server | Server |
| `servers.eu` | Europe | Europa |
| `servers.na-east` | NA East | NA Est |
| `servers.na-west` | NA West | NA Ovest |
| `serverHint` | Event times follow your server's clock. | Gli orari degli eventi seguono l'ora del tuo server. |

In `src/components/settings/region-select.tsx`:
- Import `setSettings` alongside `setRegion`, and `SERVER_IDS, type ServerId` alongside `REGION_IDS`.
- Read `const server = useUserStore((s) => s.data.settings.server);`.
- After the region `<Select>`, inside the same grid, add:

```tsx
      {region === "global" && (
        <>
          <Label htmlFor="server">{t("server")}</Label>
          <Select value={server} items={SERVER_IDS.map((s) => ({ value: s, label: t(`servers.${s}`) }))} onValueChange={(v) => v && update((d) => setSettings(d, { server: v as ServerId }))}>
            <SelectTrigger id="server" className="min-h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SERVER_IDS.map((s) => <SelectItem key={s} value={s}>{t(`servers.${s}`)}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t("serverHint")}</p>
        </>
      )}
```

- [ ] **Step 4: Verify and commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: everything passes. The i18n parity test covers the new keys.

```bash
git add -A
git -c user.name="Davide Sidoti" -c user.email="sidotidavide@gmail.com" commit -m "feat: server setting for Global event times

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Countdown components

**Files:**
- Create: `src/components/shell/event-countdown.tsx`, `src/components/shell/event-countdown.test.tsx`
- Modify: `messages/en.json`, `messages/it.json`

**Interfaces:**
- Consumes: `EVENTS`, `EVENTS_META`, `eventStatus`, `type EventId` from Task 1; `settings.server` from Task 2; `useNow`, `formatCountdown`.
- Produces: `EventCountdown({ id }: { id: EventId })` (compact, top bar) and `NextEvents()` (Home card).

- [ ] **Step 1: Messages**

Add a top-level `events` object in EN:

```json
"events": {
  "title": "Next events",
  "open": "Open · {left}",
  "community": "Community times, checked {date}. Sources:"
}
```

And in IT:

```json
"events": {
  "title": "Prossimi eventi",
  "open": "Aperto · {left}",
  "community": "Orari della community, verificati il {date}. Fonti:"
}
```

- [ ] **Step 2: Write the failing tests**

```tsx
// src/components/shell/event-countdown.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/en.json";
import { useUserStore } from "@/store/user-store";
import { createDefaultUserData } from "@/lib/user-data";
import { EventCountdown, NextEvents } from "./event-countdown";

const renderIt = (ui: React.ReactNode) => render(<NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">{ui}</NextIntlClientProvider>);

beforeEach(() => {
  useUserStore.setState({ data: createDefaultUserData(new Date("2026-10-14T00:00:00Z")), hydrated: true });
});
afterEach(() => vi.useRealTimers());

describe("EventCountdown", () => {
  it("counts down to the next Rift (EU)", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-14T10:20:00Z")); // 12:20 CEST, next Rift 14:00 CEST = 12:00Z
    renderIt(<EventCountdown id="rift" />);
    expect(screen.getByText("Spacetime Rift")).toBeInTheDocument();
    expect(screen.getByText("1h 40m")).toBeInTheDocument();
  });
  it("shows the time left while the window is open", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-14T12:03:00Z")); // Rift opened at 12:00Z, 10-minute window
    renderIt(<EventCountdown id="rift" />);
    expect(screen.getByText("Open · 7m")).toBeInTheDocument();
  });
});

describe("NextEvents", () => {
  it("lists every event with the sources note", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-14T10:20:00Z"));
    renderIt(<NextEvents />);
    for (const name of ["Shugo Festival", "Dimensional Invasion", "Spacetime Rift", "Artifact Siege", "Guardian Lord Nahma"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.getByText(/Community times, checked/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "shugo.gg" })).toHaveAttribute("href", "https://shugo.gg/timers");
  });
});
```

Run: `pnpm test src/components/shell/event-countdown.test.tsx`
Expected: FAIL, because `./event-countdown` does not exist.

- [ ] **Step 3: Implement**

```tsx
// src/components/shell/event-countdown.tsx
"use client";
import { useLocale, useTranslations } from "next-intl";
import { useNow } from "@/hooks/use-now";
import { useUserStore } from "@/store/user-store";
import { EVENTS, EVENTS_META, eventStatus, type EventId, type GameEvent } from "@/lib/events";
import { formatCountdown } from "@/lib/format";
import { cn } from "@/lib/utils";

// Null on the server and before mount (useNow), so markup matches.
function useEventStatus(event: GameEvent) {
  const now = useNow();
  const region = useUserStore((s) => s.data.settings.region);
  const server = useUserStore((s) => s.data.settings.server);
  return now ? { now, ...eventStatus(event, region, server, now) } : null;
}

function useCountdownText(event: GameEvent): { text: string; open: boolean } | null {
  const t = useTranslations("events");
  const tu = useTranslations("reset.units");
  const s = useEventStatus(event);
  if (!s) return null;
  const units = { d: tu("d"), h: tu("h"), m: tu("m") };
  return s.open
    ? { text: t("open", { left: formatCountdown(s.end.getTime() - s.now.getTime(), units) }), open: true }
    : { text: formatCountdown(s.start.getTime() - s.now.getTime(), units), open: false };
}

const byId = (id: EventId) => EVENTS.find((e) => e.id === id)!;

export function EventCountdown({ id }: { id: EventId }) {
  const locale = useLocale();
  const event = byId(id);
  const value = useCountdownText(event);
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{event.name[locale === "it" ? "it" : "en"]}</span>
      <span className={cn("font-mono text-sm tabular-nums", value?.open ? "font-semibold text-emerald-400" : "text-primary")}>{value?.text ?? "—"}</span>
    </div>
  );
}

function EventRow({ event }: { event: GameEvent }) {
  const locale = useLocale();
  const value = useCountdownText(event);
  const s = useEventStatus(event);
  const when = s && new Intl.DateTimeFormat(locale, { weekday: "short", hour: "2-digit", minute: "2-digit" }).format(s.start);
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-border/60 py-2 first:border-t-0">
      <span>{event.name[locale === "it" ? "it" : "en"]}</span>
      <span className="flex items-baseline gap-3">
        <span className="text-xs text-muted-foreground" data-testid={`event-when-${event.id}`}>{when ?? ""}</span>
        <span className={cn("font-mono text-sm tabular-nums", value?.open ? "font-semibold text-emerald-400" : "text-primary")}>{value?.text ?? "—"}</span>
      </span>
    </li>
  );
}

export function NextEvents() {
  const t = useTranslations("events");
  const locale = useLocale();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(EVENTS_META.checked));
  return (
    <section aria-labelledby="next-events-title" className="rounded-lg border border-border bg-card p-4">
      <h2 id="next-events-title" className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{t("title")}</h2>
      <ul className="text-sm">{EVENTS.map((e) => <EventRow key={e.id} event={e} />)}</ul>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("community", { date })}{" "}
        {EVENTS_META.sources.map((s) => (
          <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="mr-2 inline-flex min-h-11 items-center text-primary underline underline-offset-2">{s.label}</a>
        ))}
      </p>
    </section>
  );
}
```

**Colour check:** if the project defines an accent or success token in `src/app/globals.css` (for example `--success`), use it instead of `text-emerald-400`. If it doesn't, keep `text-emerald-400`, which reads on the dark background.

Run: `pnpm test src/components/shell/event-countdown.test.tsx`
Expected: PASS.

- [ ] **Step 4: Verify and commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: everything passes.

```bash
git add -A
git -c user.name="Davide Sidoti" -c user.email="sidotidavide@gmail.com" commit -m "feat: event countdown and next events components

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Wire into the top bar and Home; fix the roadmap text

**Files:**
- Modify: `src/components/shell/top-bar.tsx`, `src/components/home/home-dashboard.tsx`, `content/guides/roadmap.json`
- Create: `e2e/events.spec.ts`

**Interfaces:**
- Consumes: `EventCountdown`, `NextEvents` from Task 3.

- [ ] **Step 1: Write the failing e2e test**

```ts
// e2e/events.spec.ts
import { test, expect } from "@playwright/test";

test.use({ timezoneId: "Europe/Rome" });

test.beforeEach(async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("dialog", { name: "Welcome to AionTools" }).getByRole("button", { name: "Skip" }).click();
});

test("the top bar shows the Rift and Shugo countdowns on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const bar = page.locator("body > div header").first();
  await expect(bar.getByText("Spacetime Rift")).toBeVisible();
  await expect(bar.getByText("Shugo Festival")).toBeVisible();
});

test("switching the Global server changes the event times on Home", async ({ page }) => {
  await page.goto("/en");
  const siege = page.getByTestId("event-when-siege");
  await expect(siege).not.toBeEmpty();
  const before = await siege.textContent();

  await page.goto("/en/settings");
  await page.getByLabel("Server").click();
  await page.getByRole("option", { name: "NA West" }).click();
  await page.goto("/en");
  await expect(siege).not.toHaveText(before!);
});
```

Run: `pnpm build && pnpm exec playwright test e2e/events.spec.ts`
Expected: FAIL, because nothing is wired yet.

- [ ] **Step 2: Wire**

`src/components/shell/top-bar.tsx`:
- Import `{ EventCountdown }` from `./event-countdown`.
- After the resets `<div className="hidden items-center gap-4 sm:flex">…</div>`, add:

```tsx
      <div className="hidden items-center gap-4 lg:flex">
        <EventCountdown id="rift" />
        <EventCountdown id="shugo" />
      </div>
```

`src/components/home/home-dashboard.tsx`:
- Import `{ NextEvents }` from `@/components/shell/event-countdown`.
- Right after the resets grid `</div>`, add `<NextEvents />`.

`content/guides/roadmap.json`, item `gear-1000-1`:
- EN: replace `which opens every 3 hours (2, 5, 8 and 11 EST server time)` with `which opens every 3 hours, server time (see the countdown in the top bar)`.
- IT: replace `che si apre ogni 3 ore (2, 5, 8 e 11 ora server EST)` with `che si apre ogni 3 ore, ora del server (vedi il countdown in alto)`.

- [ ] **Step 3: Verify everything**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e`
Expected: every command exits 0. That includes the 375 px no-sideways-scroll tests in `e2e/builds.spec.ts`, which cover Home, and the top-bar alignment test in `e2e/polish.spec.ts`.

If the Siege test fails because both servers render the same text, check that Siege's next start for `na-west` is a different instant: it should be, since 21:00 PDT is 04:00Z the next day versus 19:00Z for EU. Then check that the select really saved the value (`localStorage` `aiontools:user-data` → `settings.server`).

- [ ] **Step 4: Commit**

```bash
git add -A
git -c user.name="Davide Sidoti" -c user.email="sidotidavide@gmail.com" commit -m "feat: event countdowns in the top bar and next events on Home

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
