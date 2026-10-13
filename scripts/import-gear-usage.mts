// scripts/import-gear-usage.mts
// Usage shares per class and region from GameWith build stats; icons self-hosted under public/gear.
// Run by hand after patches: `node scripts/import-gear-usage.mts`. Writes nothing if any page fails to parse.
import { JSDOM } from "jsdom";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { parseGameWithPage, mergeUsage, GearUsageSchema, type ClassUsage, type GearUsage } from "../src/lib/gear-usage-parser.ts";

const CLASSES: Record<string, string> = {
  chanter: "chanter", ranger: "ranger", cleric: "cleric", "spirit-master": "elementalist",
  gladiator: "gladiator", sorcerer: "sorcerer", templar: "templar", assassin: "assassin",
};
const REGIONS = { global: ["nae", "eu"], kr: ["kr"], tw: ["tw"] } as const;
const UA = { "user-agent": "aiontools-gear-import/1.0 (+https://github.com/davidesidoti/aiontools)" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string): Promise<Response> {
  await sleep(1000); // be polite: sequential, one request per second
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res;
}

const files: GearUsage[] = [];
for (const [region, sources] of Object.entries(REGIONS) as [GearUsage["region"], readonly string[]][]) {
  const classes: Record<string, ClassUsage> = {};
  const dates: string[] = [];
  for (const [classId, slug] of Object.entries(CLASSES)) {
    const parts: ClassUsage[] = [];
    for (const gw of sources) {
      const url = `https://gamewith.ai/aion2/en/build-stats/${gw}/${slug}`;
      const doc = new JSDOM(await (await get(url)).text()).window.document;
      const { dataDate, usage } = parseGameWithPage(doc, url);
      parts.push(usage);
      dates.push(dataDate);
    }
    classes[classId] = mergeUsage(parts);
  }
  files.push(GearUsageSchema.parse({ region, fetchedAt: dates.sort()[0], classes }));
}

// Self-host icons: every remote icon becomes /gear/<file>.webp.
const icons = new Map<string, string>();
for (const file of files)
  for (const c of Object.values(file.classes))
    for (const e of [...Object.values(c.slots).flat(), ...c.titles, ...c.wings]) {
      if (!e?.icon) continue;
      const local = `/gear/${basename(new URL(e.icon).pathname).toLowerCase()}`;
      icons.set(e.icon, local);
      e.icon = local;
    }
mkdirSync("public/gear", { recursive: true });
for (const [remote, local] of icons) {
  if (existsSync(`public${local}`)) continue;
  writeFileSync(`public${local}`, Buffer.from(await (await get(remote)).arrayBuffer()));
}

mkdirSync("content/gear/usage", { recursive: true });
for (const file of files) {
  writeFileSync(`content/gear/usage/${file.region}.json`, JSON.stringify(file, null, 2) + "\n");
  const samples = Object.entries(file.classes).map(([id, c]) => `${id} ${c.sample}`).join(", ");
  console.log(`${file.region}: data ${file.fetchedAt}; ${samples}`);
}
console.log(`icons: ${icons.size}`);
