// scripts/import-guide-images.mts
// One-off: extracts images from the community spreadsheets into public/guides/.
// Run with `node scripts/import-guide-images.mts` (Node ≥ 23.6 strips TypeScript types natively).
import ExcelJS from "exceljs";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const SHEETS = {
  builds: "1lbHaVairHaz26M8XGNF9CBWqiiHHBM6CylTwNKnlOug",
  tools: "121rqeIxOQkEOUrXzGcP5slP6cGhqPbP-484WBjJMbeM",
};
// Content Guide icons are not extracted: Google exports them as one-cell anchors whose offsets
// depend on auto-fitted row heights that the xlsx does not contain, so their rows can't be recovered.

async function load(id: string) {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`);
  if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
  const wb = new ExcelJS.Workbook();
  // exceljs types predate the generic Node Buffer.
  await wb.xlsx.load(Buffer.from(await res.arrayBuffer()) as unknown as Parameters<typeof wb.xlsx.load>[0]);
  return wb;
}

function images(wb: ExcelJS.Workbook, tab: string) {
  const ws = wb.getWorksheet(tab);
  if (!ws) throw new Error(`missing tab: ${tab}`);
  return ws
    .getImages()
    .map((img) => ({ row: img.range.tl.nativeRow + 1, col: img.range.tl.nativeCol + 1, media: wb.getImage(Number(img.imageId)) }))
    .sort((a, b) => a.row - b.row || a.col - b.col);
}

function save(path: string, media: ExcelJS.Image) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.from(media.buffer!));
  console.log("wrote", path);
}

const tools = await load(SHEETS.tools);
for (const img of images(tools, "Crafting Tips")) {
  save(`public/guides/crafting/${img.col <= 13 ? "crafted" : "expedition"}.${img.media.extension}`, img.media);
}

const builds = await load(SHEETS.builds);
// Rows above 15 illustrate tip 1 (the macro key); the rest are the recommended settings.
const tips = images(builds, "Tips(+settings)");
tips.filter((img) => img.row < 15).forEach((img, i) => save(`public/guides/tips/macro-${i + 1}.${img.media.extension}`, img.media));
tips.filter((img) => img.row >= 15).forEach((img, i) => save(`public/guides/tips/setting-${i + 1}.${img.media.extension}`, img.media));
