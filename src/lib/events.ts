// src/lib/events.ts
import { z } from "zod";
import raw from "@content/events.json";
import { FullTextSchema } from "./text";
import { REGION_IDS, eventTimeZone, type RegionId, type ServerId } from "./regions";
import { wallClock, zonedInstant } from "./tz";

const HOUR = 3_600_000;
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

function startsOn(rule: Extract<Rule, { kind: "fixed" }>, y: number, mo: number, d: number): [number, number][] {
  const weekday = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  if (rule.days && !rule.days.includes(weekday)) return [];
  return rule.times.map((t) => t.split(":").map(Number) as [number, number]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

// First start whose window hasn't ended yet: a start that is still open counts.
export function nextOccurrence(rule: Rule, timeZone: string, now: Date, durationMin: number): Date {
  const from = now.getTime() - durationMin * 60_000;
  // Every real hour, including both copies of a repeated autumn hour. Assumes whole-hour zone offsets (true for all five servers).
  if (rule.kind === "hourly") return new Date((Math.floor((from - rule.minute * 60_000) / HOUR) + 1) * HOUR + rule.minute * 60_000);
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
