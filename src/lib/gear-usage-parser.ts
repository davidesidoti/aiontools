// src/lib/gear-usage-parser.ts
// Parses GameWith build-stats pages (gamewith.ai/aion2/en/build-stats/<region>/<class>) and merges regions.
// No path aliases: scripts/import-gear-usage.mts imports this file directly with Node.
import { z } from "zod";

export const GEAR_SLOTS = [
  "weapon", "guard", "helmet", "shoulder", "torso", "gloves", "pants", "boots", "cape",
  "earring", "necklace", "ring", "bracelet", "belt", "amulet", "rune",
] as const;
export type GearSlot = (typeof GEAR_SLOTS)[number];

const Entry = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  share: z.number().min(0).max(100),
  enhance: z.number().int().min(0).optional(),
});
export const ClassUsageSchema = z.object({
  sample: z.number().int().positive(),
  sourceUrls: z.array(z.url()).min(1),
  slots: z.partialRecord(z.enum(GEAR_SLOTS), z.array(Entry)),
  titles: z.array(Entry),
  wings: z.array(Entry),
});
export const GearUsageSchema = z.object({
  region: z.enum(["global", "kr", "tw"]),
  fetchedAt: z.iso.date(),
  classes: z.record(z.string(), ClassUsageSchema),
});
export type UsageEntry = z.infer<typeof Entry>;
export type ClassUsage = z.infer<typeof ClassUsageSchema>;
export type GearUsage = z.infer<typeof GearUsageSchema>;

const SLOT_HEADINGS: Record<string, GearSlot> = {
  "Main hand": "weapon", "Off hand": "guard", Helm: "helmet", Pauldrons: "shoulder", Chest: "torso",
  Gloves: "gloves", Greaves: "pants", Boots: "boots", Cloak: "cape", Earrings: "earring",
  Necklace: "necklace", Rings: "ring", Bracelets: "bracelet", Belt: "belt", Amulet: "amulet", Runes: "rune",
};
const TOP = { slot: 3, titles: 10, wings: 5 };
const round1 = (n: number) => Math.round(n * 10) / 10;

function share(text: string, url: string): number {
  const m = text.match(/(\d+(?:\.\d+)?)%/);
  if (!m) throw new Error(`${url}: share not found in "${text.trim()}"`);
  return Number(m[1]);
}

// The same name can be listed twice (faction or grade variants): add their shares.
function combine(entries: UsageEntry[]): UsageEntry[] {
  const byName = new Map<string, UsageEntry>();
  for (const e of entries) {
    const prev = byName.get(e.name);
    byName.set(e.name, prev ? { ...prev, share: round1(prev.share + e.share) } : e);
  }
  return [...byName.values()].sort((a, b) => b.share - a.share);
}

const clean = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

function table(doc: Document, header: string): HTMLTableElement | undefined {
  return [...doc.querySelectorAll("table")].find((t) => t.querySelector("thead th")?.textContent?.trim() === header);
}

function simpleRows(t: HTMLTableElement | undefined, url: string): UsageEntry[] {
  if (!t) return [];
  return combine([...t.querySelectorAll("tbody tr")].map((tr) => {
    const td = tr.querySelectorAll("td");
    return clean({
      name: td[0].textContent?.trim() ?? "",
      icon: td[0].querySelector("img")?.getAttribute("src") ?? undefined,
      share: share(td[1].textContent ?? "", url),
    });
  }));
}

export function parseGameWithPage(doc: Document, url: string): { dataDate: string; usage: ClassUsage } {
  const sample = Number(doc.querySelector(".classes-hero__meta")?.textContent?.match(/^([\d,]+) characters/)?.[1]?.replace(/,/g, ""));
  if (!sample) throw new Error(`${url}: sample size not found`);
  const ld = [...doc.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent ?? "").join("");
  const dataDate = ld.match(/"dateModified":"(\d{4}-\d{2}-\d{2})"/)?.[1];
  if (!dataDate) throw new Error(`${url}: data date not found`);

  const slots: ClassUsage["slots"] = {};
  for (const block of doc.querySelectorAll("#equipment .bs-slot")) {
    const slot = SLOT_HEADINGS[block.querySelector("h3")?.textContent?.trim() ?? ""];
    if (!slot) continue; // Arcana, and slots our model doesn't have (Pendant, Brooches, Seals)
    slots[slot] = combine([...block.querySelectorAll("tbody tr")].map((tr) => {
      const td = tr.querySelectorAll("td");
      const enhance = td[3]?.textContent?.match(/\d+/)?.[0];
      return clean({
        name: td[0].querySelector(".classes-skill > span")?.firstChild?.textContent?.trim() ?? "",
        icon: td[0].querySelector("img")?.getAttribute("src") ?? undefined,
        share: share(td[2]?.textContent ?? "", url),
        enhance: enhance === undefined ? undefined : Number(enhance),
      });
    }));
  }
  if (Object.keys(slots).length === 0) throw new Error(`${url}: no gear slots found`);
  if (Object.values(slots).some((list) => list.some((e) => !e.name))) throw new Error(`${url}: item without a name`);

  return { dataDate, usage: { sample, sourceUrls: [url], slots, titles: simpleRows(table(doc, "Title"), url), wings: simpleRows(table(doc, "Wing"), url) } };
}

function mergeList(lists: UsageEntry[][], samples: number[], total: number, limit: number): UsageEntry[] {
  const acc = new Map<string, { entry: UsageEntry; weighted: number }>();
  lists.forEach((list, i) => {
    for (const e of list) {
      const prev = acc.get(e.name);
      acc.set(e.name, { entry: prev?.entry ?? e, weighted: (prev?.weighted ?? 0) + e.share * samples[i] });
    }
  });
  return [...acc.values()]
    .map(({ entry, weighted }) => ({ ...entry, share: round1(weighted / total) }))
    .sort((a, b) => b.share - a.share)
    .slice(0, limit);
}

export function mergeUsage(parts: ClassUsage[]): ClassUsage {
  const samples = parts.map((p) => p.sample);
  const total = samples.reduce((a, b) => a + b, 0);
  const slots: ClassUsage["slots"] = {};
  for (const slot of GEAR_SLOTS) {
    const lists = parts.map((p) => p.slots[slot] ?? []);
    if (lists.some((l) => l.length > 0)) slots[slot] = mergeList(lists, samples, total, TOP.slot);
  }
  return {
    sample: total,
    sourceUrls: parts.flatMap((p) => p.sourceUrls),
    slots,
    titles: mergeList(parts.map((p) => p.titles), samples, total, TOP.titles),
    wings: mergeList(parts.map((p) => p.wings), samples, total, TOP.wings),
  };
}
