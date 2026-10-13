// scripts/import-skill-icons.mts
// One-off: skill icons from questlog.gg's database API and class icons from DaevaOS, self-hosted under public/icons.
// Run with `node scripts/import-skill-icons.mts`.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const CLASSES: Record<string, { questlog: string; daevaos: string }> = {
  chanter: { questlog: "chanter", daevaos: "chanter" },
  ranger: { questlog: "ranger", daevaos: "ranger" },
  cleric: { questlog: "cleric", daevaos: "cleric" },
  "spirit-master": { questlog: "elementalist", daevaos: "elementalist" },
  gladiator: { questlog: "gladiator", daevaos: "gladiator" },
  sorcerer: { questlog: "sorcerer", daevaos: "sorcerer" },
  templar: { questlog: "templar", daevaos: "templar" },
  assassin: { questlog: "assassin", daevaos: "assassin" },
};
const UA = { "user-agent": "aiontools-icon-import/1.0 (+https://github.com/davidesidoti/aiontools)" };
const normName = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

async function download(url: string, path: string) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
}

type QuestlogSkill = { name: string; icon: string; subCategory: string };

const icons: { classes: Record<string, string>; skills: Record<string, Record<string, string>> } = { classes: {}, skills: {} };
for (const [classId, src] of Object.entries(CLASSES)) {
  await download(`https://daevaos.com/game/classes/${src.daevaos}.webp`, `public/icons/classes/${classId}.webp`);
  icons.classes[classId] = `/icons/classes/${classId}.webp`;

  const input = encodeURIComponent(JSON.stringify({ language: "en", page: 1, mainCategory: src.questlog }));
  const res = await fetch(`https://questlog.gg/aion-2/api/trpc/database.getSkills?input=${input}`, { headers: UA });
  if (!res.ok) throw new Error(`${classId}: HTTP ${res.status}`);
  const data = (await res.json()).result.data as { pageCount: number; pageData: QuestlogSkill[] };
  if (data.pageCount !== 1 || data.pageData.length === 0) throw new Error(`${classId}: unexpected paging ${data.pageCount}/${data.pageData.length}`);

  const map: Record<string, string> = {};
  for (const s of [...data.pageData].sort((a, b) => a.name.localeCompare(b.name))) {
    // "/assets/Game/UI/.../ICON_RA_SKILL_038.ICON_RA_SKILL_038" → ".../ICON_RA_SKILL_038.webp"
    const assetPath = s.icon.replace(/\.[^./]+$/, "");
    const file = assetPath.split("/").pop()!;
    const local = `/icons/skills/${classId}/${file}.webp`;
    await download(`https://cdn.questlog.gg/aion-2${assetPath}.webp`, `public${local}`);
    map[normName(s.name)] = local;
  }
  icons.skills[classId] = map;
  console.log(`${classId}: ${Object.keys(map).length} skill icons`);
}
writeFileSync("content/icons.json", JSON.stringify(icons, null, 2) + "\n");
console.log("wrote content/icons.json");
