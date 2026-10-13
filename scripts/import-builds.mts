// scripts/import-builds.mts
// Re-runnable: sheet class tabs → content/builds/<classId>.json and public/builds/<classId>/shot-N.<ext>.
// Run with `node scripts/import-builds.mts`. Fails without writing if any tab's layout changed.
import ExcelJS from "exceljs";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { parseClassTab, type Cells } from "../src/lib/build-parser.ts";

const SHEET = "1lbHaVairHaz26M8XGNF9CBWqiiHHBM6CylTwNKnlOug";
const TABS: Record<string, { tab: string; name: string }> = {
  chanter: { tab: "Chanter", name: "Chanter" },
  ranger: { tab: "Ranger", name: "Ranger" },
  cleric: { tab: "Cleric", name: "Cleric" },
  "spirit-master": { tab: "Spirit Master", name: "Spirit Master" },
  gladiator: { tab: "Gladiator", name: "Gladiator" },
  sorcerer: { tab: "Sorcerer", name: "Sorcerer" },
  templar: { tab: "Templar", name: "Templar" },
  assassin: { tab: "Assassin", name: "Assassin" },
};

const res = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET}/export?format=xlsx`);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const wb = new ExcelJS.Workbook();
// exceljs types predate the generic Node Buffer.
await wb.xlsx.load(Buffer.from(await res.arrayBuffer()) as unknown as Parameters<typeof wb.xlsx.load>[0]);

// Reads text from any exceljs value shape: plain, rich text, hyperlink (whose text may be rich), formula result.
// (cell.text throws on some merged cells and returns objects for rich text.)
function valueText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v !== "object") return String(v);
  if (v instanceof Date) return v.toISOString();
  const o = v as { richText?: { text: string }[]; text?: unknown; result?: unknown; hyperlink?: string };
  if (o.richText) return o.richText.map((r) => r.text).join("");
  if (o.text !== undefined) return valueText(o.text);
  if (o.result !== undefined) return valueText(o.result);
  return o.hyperlink ?? "";
}
const cellText = (cell: ExcelJS.Cell) => valueText(cell.value);

const outputs: [string, string][] = [];
const images: [string, ExcelJS.Image][] = [];
for (const [id, { tab, name }] of Object.entries(TABS)) {
  const ws = wb.getWorksheet(tab);
  if (!ws) throw new Error(`missing tab: ${tab}`);
  const cells: Cells = {};
  ws.eachRow((row) => row.eachCell((cell) => {
    if (cell.isMerged && cell.master.address !== cell.address) return; // merged slaves repeat the master's value
    const text = cellText(cell).trim();
    if (text) cells[cell.address] = text;
  }));
  const parsed = parseClassTab(cells); // throws on layout changes, before anything is written
  const shots = ws
    .getImages()
    .map((img) => ({ row: img.range.tl.nativeRow, col: img.range.tl.nativeCol, media: wb.getImage(Number(img.imageId)) }))
    .sort((a, b) => a.row - b.row || a.col - b.col);
  const screenshots = shots.map((s, i) => `/builds/${id}/shot-${i + 1}.${s.media.extension}`);
  shots.forEach((s, i) => images.push([`public${screenshots[i]}`, s.media]));
  outputs.push([`content/builds/${id}.json`, JSON.stringify({ id, name, ...parsed, screenshots }, null, 2) + "\n"]);
}

mkdirSync("content/builds", { recursive: true });
for (const [path, json] of outputs) writeFileSync(path, json);
rmSync("public/builds", { recursive: true, force: true });
for (const [path, media] of images) {
  mkdirSync(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  writeFileSync(path, Buffer.from(media.buffer!));
}
console.log(`wrote ${outputs.length} builds and ${images.length} screenshots`);
