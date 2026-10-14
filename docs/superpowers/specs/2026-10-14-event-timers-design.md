# Event Timers — Design Spec

Date: 2026-10-14
Status: approved in brainstorming, awaiting written-spec review
Extends: `docs/superpowers/specs/2026-10-13-aiontools-design.md` (its stack, i18n, dark-only theme, testing and deploy rules still apply)

## 1. Goal

Show countdowns to recurring timed events next to the existing reset countdowns, so a player knows at a glance when the next Spacetime Rift opens or the next Shugo Festival starts.

### What research found (2026-10-14)

- NCSOFT publishes no official global event schedule. Every time below comes from community timer sites updated 2026-10-06…13 (shugo.gg, aion2rifttimer.com, daevaguides.com, metabot.gg, aion2hub.com). For KR, Inven and ddaily patch notes are the sources.
- **Resets** are pinned to UTC: global 07:00 UTC daily, Wednesday weekly. They are confirmed and stay as they are.
- **Events** appear to follow each server's local clock: EU on Europe/Berlin, NA East on America/New_York, NA West on America/Los_Angeles. Today (summer time) all three land on the same UTC instants. Whether they follow DST is unverified: the first evidence comes with the EU switch on 2026-10-25 and the US switch on 2026-11-01.

| Event | Global (server local) | KR (Asia/Seoul) | TW (Asia/Taipei) | Window |
|---|---|---|---|---|
| Shugo Festival | every hour at :00 | every hour at :00 | every hour at :00 | 10 min |
| Dimensional Invasion | every hour at :30 | every hour at :30 | every hour at :30 | 15 min |
| Spacetime Rift | daily 02, 05, 08, 11, 14, 17, 20, 23 | same hours | same hours | 10 min (entry) |
| Artifact Siege | Mon, Thu, Sat 21:00 | Wed, Sat 21:20 | Wed, Sat 21:30 | 30 min |
| Guardian Lord Nahma | Fri, Sun 21:00 | Fri, Sun 22:00 | Fri, Sun 22:00 | 30 min |

KR siege and Nahma run in several waves by matching group; only the first wave is listed.

## 2. Scope

In scope:

- A curated event file with schedules per region, sources and a verification date.
- A new `server` setting for the Global region: `eu` (default), `na-east`, `na-west`.
- Event time computed in the server's IANA time zone, DST included, using `Intl` only (no new dependency).
- Rift and Shugo countdowns in the top bar, with an "open now" state.
- A "Next events" card on Home listing all five events.
- A "community times, checked <date>" note linking the sources.
- The roadmap text "2, 5, 8 and 11 EST server time" becomes "every 3 hours, server time".

Out of scope:

- Field bosses (they respawn after a kill, with no fixed clock).
- Browser notifications.
- KR/TW-only events (Rift Domination, Abyss Rift Zone).
- Season and pass end dates.
- Changing how resets are computed.

## 3. Data

### 3.1 `content/events.json`

Validated with Zod at module load.

```ts
type EventsFile = {
  checked: string;                       // ISO date the times were last verified
  sources: { label: string; url: string }[];
  events: {
    id: "shugo" | "invasion" | "rift" | "siege" | "nahma";
    name: FullText;
    durationMin: number;                 // the "open" window after each start
    schedule: Record<RegionId, Rule>;    // global | kr | tw
  }[];
};
type Rule =
  | { kind: "hourly"; minute: number }                              // every hour at :minute
  | { kind: "fixed"; days?: number[]; times: string[] };            // "HH:MM" local; days 0=Sun…6=Sat, omitted = every day
```

### 3.2 Servers and time zones — `src/lib/regions.ts`

```ts
export const SERVER_IDS = ["eu", "na-east", "na-west"] as const;   // Global only
const EVENT_TZ = { eu: "Europe/Berlin", "na-east": "America/New_York", "na-west": "America/Los_Angeles", kr: "Asia/Seoul", tw: "Asia/Taipei" };
export function eventTimeZone(region: RegionId, server: ServerId): string;
```

### 3.3 User data

- `settings.server: z.enum(SERVER_IDS).default("eu")`. Stored data and sync payloads without the field parse as `eu`, so `USER_DATA_VERSION` stays 1.
- `setServer(data, server)` lives next to `setRegion`.
- The settings UI shows the server select only when the region is `global`.

## 4. Logic — `src/lib/events.ts`

- `nextOccurrence(rule, timeZone, now): Date` gives the first start strictly after `now - duration`. A start that is still open counts as the current occurrence.
- `eventStatus(event, region, server, now): { start: Date; open: boolean }`. `open` means `start <= now < start + duration`.
- Time-zone math uses `Intl.DateTimeFormat(…, { timeZone, hourCycle: "h23", … }).formatToParts`. It gets the zone's wall-clock fields for an instant, and converts a local wall time back to an instant by iterating on the offset. This handles DST: a local time that falls inside the spring-forward gap moves to the next valid instant, and a repeated autumn hour takes its first instance.

## 5. UI

- **Top bar** (desktop): Daily reset, Weekly reset, then Rift and Shugo from `lg` up.
  - Each countdown uses the existing compact `ResetCountdown` look: label above, monospace value below.
  - When an event is open, the value reads "Open · 7m", with the minutes left in the window, in the accent colour.
  - Rendering stays null-safe through `useNow`: "—" on the server and before mount.
- **Home**: a "Next events" card under the reset countdowns. It shows one row per event: the name, the countdown or "Open · Nm", and the next start's weekday and time in the viewer's own time zone (for example "Thu 21:00"). A footer reads "Community times, checked Oct 14, 2026", with the source links.
- **Settings → Region**: a "Server" select (EU / NA East / NA West) under the region select, visible only for Global.
- Every new string goes in EN and IT. Event names stay in English, as in the game.

## 6. Error handling

- An invalid `events.json` fails the build at module load, which is the existing content rule.
- An unknown time zone can't happen: the zones are a fixed map of 5 valid names.
- Stored data with an invalid `server` value fails the existing user-data validation, and the existing corrupt-data path applies.

## 7. Testing

- **Unit, time zones:**
  - Rift next start in Europe/Berlin before and after the 2026-10-25 switch.
  - America/New_York across 2026-11-01.
  - Asia/Seoul, which has no DST.
  - The repeated autumn hour, and the spring gap (a synthetic rule in March 2027 Europe/Berlin).
- **Unit, rules:**
  - an hourly rule at :30;
  - a fixed rule with days, where the next start is days away;
  - an "open now" window and its end.
- **Unit, user data:**
  - stored data without `server` parses as `eu`;
  - `setServer` changes only that field.
- **Unit, schema:** `events.json` validates, every event has a rule for every region, and `HH:MM` is well-formed.
- **Component:** an event countdown renders "Open · Nm" during the window and a countdown otherwise, with a fixed `now`.
- **e2e:** the Rift countdown is visible in the top bar at 1280 px. Switching the server to NA West in settings changes the Home "Next events" times. The 375 px no-sideways-scroll check stays green.
