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
export const KNOWN_MISSING_ICONS = new Set<string>([
  "assassin:Evasion Block", // no skill of that name in questlog's Assassin list; Evasion Stance/Contract differ, so not guessed
]);
