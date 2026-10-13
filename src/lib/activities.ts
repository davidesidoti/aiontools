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
