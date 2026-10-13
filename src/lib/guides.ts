// src/lib/guides.ts
import { z } from "zod";
import guideRaw from "@content/guides/content-guide.json";
import roadmapRaw from "@content/guides/roadmap.json";
import tipsRaw from "@content/guides/tips.json";
import buffsRaw from "@content/guides/buffs.json";
import linksRaw from "@content/guides/links.json";
import { FullTextSchema } from "./text";
import { localize, type Activity } from "./activities";
import { CLASSES } from "./classes";
import type { UserData } from "./user-data";

const Id = z.string().regex(/^[a-z0-9-]+$/);
const Url = z.url().refine((u) => u.startsWith("https://"), "https only");
const Asset = z.string().regex(/^\/guides\/[a-z0-9/-]+\.(png|jpe?g|webp|gif)$/);
const unique = <T,>(items: T[], key: (t: T) => string) => new Set(items.map(key)).size === items.length;

export const GUIDE_SECTIONS = ["daily", "weekly", "recharge", "misc"] as const;
export type GuideSection = (typeof GUIDE_SECTIONS)[number];
export const GUIDE_PAGES = ["content", "roadmap", "tips", "buffs", "links"] as const;

const GuideEntrySchema = z.object({
  id: Id,
  name: z.string().min(1),
  section: z.enum(GUIDE_SECTIONS),
  type: FullTextSchema,
  scope: z.enum(["main", "alt", "both"]),
  modes: z.array(z.enum(["pve", "pvp"])),
  count: FullTextSchema,
  rewards: FullTextSchema,
  requirements: FullTextSchema,
  where: FullTextSchema,
  strategy: FullTextSchema,
  notes: FullTextSchema.optional(),
  icon: Asset.optional(),
});
export type GuideEntry = z.infer<typeof GuideEntrySchema>;

export const CONTENT_GUIDE = z.array(GuideEntrySchema).refine((a) => unique(a, (e) => e.id), "duplicate guide ids").parse(guideRaw);
export const GUIDE_BY_ID = new Map(CONTENT_GUIDE.map((e) => [e.id, e]));

export function guideFor(a: Activity): GuideEntry | undefined {
  return GUIDE_BY_ID.get(a.guide ?? a.id);
}

export type GuideFilter = { section: "all" | GuideSection; mode: "all" | "pve" | "pvp"; scope: "all" | "main" | "alt"; q: string };

export function filterGuide(entries: GuideEntry[], f: GuideFilter, locale: string): GuideEntry[] {
  const q = f.q.trim().toLowerCase();
  return entries.filter((e) => {
    if (f.section !== "all" && e.section !== f.section) return false;
    if (f.mode !== "all" && !e.modes.includes(f.mode)) return false;
    if (f.scope !== "all" && e.scope !== f.scope && e.scope !== "both") return false;
    if (!q) return true;
    const texts = [e.type, e.count, e.rewards, e.where, e.requirements, e.strategy, e.notes].flatMap((x) => (x ? [localize(x, locale)] : []));
    return [e.name, ...texts].some((s) => s.toLowerCase().includes(q));
  });
}

const RoadmapSchema = z
  .object({
    phases: z
      .array(
        z.object({
          id: Id,
          title: FullTextSchema,
          intro: FullTextSchema.optional(),
          items: z
            .array(z.object({ id: Id, text: FullTextSchema, kind: z.enum(["step", "note", "warning"]).default("step"), url: Url.optional() }))
            .min(1),
        }),
      )
      .min(1),
    systems: z.array(FullTextSchema),
    targets: z.array(FullTextSchema),
  })
  .refine((r) => unique(r.phases.flatMap((p) => p.items), (i) => i.id), "duplicate roadmap item ids");

export const ROADMAP = RoadmapSchema.parse(roadmapRaw);
export const ROADMAP_STEP_IDS: ReadonlySet<string> = new Set(
  ROADMAP.phases.flatMap((p) => p.items.filter((i) => i.kind === "step").map((i) => i.id)),
);

// Ids removed by a content update stay in storage but never count.
export function roadmapProgress(done: string[], steps: ReadonlySet<string> = ROADMAP_STEP_IDS) {
  return { done: new Set(done.filter((id) => steps.has(id))).size, total: steps.size };
}

export function toggleRoadmapItem(data: UserData, id: string): UserData {
  if (!ROADMAP_STEP_IDS.has(id)) return data;
  const done = data.roadmap.done.includes(id) ? data.roadmap.done.filter((x) => x !== id) : [...data.roadmap.done, id];
  return { ...data, roadmap: { done } };
}

export const TIPS = z
  .object({
    tips: z.array(z.object({ id: Id, text: FullTextSchema, images: z.array(z.object({ src: Asset, alt: FullTextSchema })).optional() })).min(1),
    settings: z.object({ intro: FullTextSchema, images: z.array(z.object({ src: Asset, alt: FullTextSchema })) }),
    links: z.array(z.object({ label: FullTextSchema, url: Url })),
  })
  .parse(tipsRaw);

const Buff = z.object({ name: z.string().min(1), detail: FullTextSchema.optional(), effects: z.array(FullTextSchema).min(1) });
export const BUFFS = z
  .object({
    intro: FullTextSchema,
    differences: z.object({ chanter: z.array(FullTextSchema), cleric: z.array(FullTextSchema) }),
    comp: FullTextSchema,
    pairs: z.array(z.object({ chanter: Buff.nullable(), cleric: Buff.nullable() })),
  })
  .parse(buffsRaw);

const CLASS_IDS = CLASSES.map((c) => c.id) as [string, ...string[]];
export const LINKS = z
  .object({
    classes: z.array(
      z.object({
        classId: z.enum(CLASS_IDS),
        guides: z.array(z.object({ label: FullTextSchema, url: Url })),
        creators: z.array(z.object({ name: z.string().min(1), url: Url })),
      }),
    ),
    tools: z.array(z.object({ label: FullTextSchema, url: Url })),
  })
  .parse(linksRaw);
