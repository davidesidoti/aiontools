// src/lib/user-data.ts
import { z } from "zod";
import { REGION_IDS, type RegionId } from "./regions";
import { lastResetAt, type ResetPeriod } from "./reset";

export const USER_DATA_VERSION = 1;
export const MAX_IMPORT_CHARS = 65_536;

const CharacterSchema = z.object({
  id: z.string().regex(/^[\w-]{1,64}$/),
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
  })
  .refine((d) => new Set(d.characters.map((c) => c.id)).size === d.characters.length, {
    message: "character ids must be unique",
  });

export type UserData = z.infer<typeof UserDataSchema>;

export function createDefaultUserData(now: Date): UserData {
  return {
    version: USER_DATA_VERSION,
    updatedAt: now.toISOString(),
    settings: { region: "global", accent: "elyos", onboarded: false },
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

// Progress already made counts as the current window of the new region, so switching never wipes it.
export function setRegion(data: UserData, region: RegionId, now: Date): UserData {
  if (region === data.settings.region) return data;
  const keep = (current: string, period: ResetPeriod) =>
    new Date(Math.max(new Date(current).getTime(), lastResetAt(now, region, period).getTime())).toISOString();
  return {
    ...data,
    settings: { ...data.settings, region },
    checklist: { ...data.checklist, lastDaily: keep(data.checklist.lastDaily, "day"), lastWeekly: keep(data.checklist.lastWeekly, "week") },
  };
}
