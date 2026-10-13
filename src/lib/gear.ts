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

// Every matching entry counts (Elyos "Wise" and Asmodian "Ebony" variants), capped at 100.
export function findMatch(entries: UsageEntry[] | undefined, match: string[]): UsageEntry | undefined {
  const hits = entries?.filter((e) => match.some((m) => normGear(e.name).includes(m))) ?? [];
  if (hits.length === 0) return undefined;
  const share = Math.min(100, Math.round(hits.reduce((sum, e) => sum + e.share, 0) * 10) / 10);
  return { ...hits[0], share };
}
