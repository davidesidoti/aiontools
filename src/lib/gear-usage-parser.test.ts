// src/lib/gear-usage-parser.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseGameWithPage, mergeUsage, GearUsageSchema, type ClassUsage } from "./gear-usage-parser";

const load = (file: string) =>
  new DOMParser().parseFromString(readFileSync(`tests/fixtures/gamewith/${file}`, "utf8"), "text/html");
const NA = "https://gamewith.ai/aion2/en/build-stats/nae/ranger";

describe("parseGameWithPage", () => {
  const { dataDate, usage } = parseGameWithPage(load("ranger-nae.html"), NA);

  it("reads the sample size, data date and source", () => {
    expect(usage.sample).toBe(476);
    expect(dataDate).toBe("2026-10-07");
    expect(usage.sourceUrls).toEqual([NA]);
  });
  it("reads every gear slot with name, icon, share and typical enhance", () => {
    expect(Object.keys(usage.slots)).toHaveLength(16);
    expect(usage.slots.weapon![0]).toEqual({
      name: "Spiritforged Bow",
      icon: "https://assets.gamewith.ai/aion2/1791880613501-322/icons/Icon_WP_BW_0078_T05.webp",
      share: 84,
      enhance: 10,
    });
    expect(usage.slots.weapon!.slice(1, 3).map((e) => e.name)).toEqual(["Aulamus Bow", "Rupture Longbow"]);
  });
  it("adds up entries that share a name", () => {
    const hell = usage.titles.filter((e) => e.name === "Through Hell and Back");
    expect(hell).toEqual([expect.objectContaining({ share: 13 })]);
  });
  it("caps shares added across grades at 100% (rounding on the page can push the sum over)", () => {
    const html = `<html><head><script type="application/ld+json">{"dateModified":"2026-10-07"}</script></head><body>
      <p class="classes-hero__meta">10 characters (top by combat power)</p>
      <section id="equipment"><div class="bs-slot"><h3>Belt</h3><table><tbody>
      ${[55, 32, 14].map((n) => `<tr><td><span class="classes-skill"><img src="x.webp"/><span>Noble Belt<small>g</small></span></span></td><td>65</td><td>${n}%</td><td>+5</td></tr>`).join("")}
      </tbody></table></div></section>
      <table><thead><tr><th>Title</th></tr></thead><tbody></tbody></table>
      <table><thead><tr><th>Wing</th></tr></thead><tbody></tbody></table></body></html>`;
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(parseGameWithPage(doc, "x").usage.slots.belt).toEqual([expect.objectContaining({ name: "Noble Belt", share: 100 })]);
  });
  it("throws when the titles or wings table is missing", () => {
    const html = readFileSync("tests/fixtures/gamewith/ranger-nae.html", "utf8").replace("<th>Wing</th>", "<th>Wings!</th>");
    expect(() => parseGameWithPage(new DOMParser().parseFromString(html, "text/html"), "x")).toThrow(/Wing/);
  });
  it("reads wings", () => {
    expect(usage.wings.length).toBeGreaterThan(0);
    expect(usage.wings[0].share).toBeGreaterThan(0);
    expect(usage.wings[0].name).toBe("Ultimate Daeva Wings");
  });
  it("ignores slots outside our model (Arcana, Pendant, Brooches, Seals)", () => {
    const tw = parseGameWithPage(load("ranger-tw.html"), "tw").usage;
    expect(Object.keys(tw.slots).sort()).toEqual(Object.keys(usage.slots).sort());
    expect(tw.slots.weapon![0].name).toBe("Splendent Genesis Dragon Lord Bow");
  });
  it("throws instead of returning empty data when the layout changed", () => {
    const empty = new DOMParser().parseFromString("<html><body><h1>Ranger</h1></body></html>", "text/html");
    expect(() => parseGameWithPage(empty, "x")).toThrow(/sample/);
  });
});

const part = (sample: number, url: string, weapon: [string, number][]): ClassUsage => ({
  sample,
  sourceUrls: [url],
  slots: { weapon: weapon.map(([name, share]) => ({ name, share })) },
  titles: [],
  wings: [],
});

describe("mergeUsage", () => {
  it("weights shares by sample size and counts a missing item as 0", () => {
    const m = mergeUsage([
      part(100, "na", [["A", 50], ["B", 50]]),
      part(300, "eu", [["A", 10], ["C", 90]]),
    ]);
    expect(m.sample).toBe(400);
    expect(m.sourceUrls).toEqual(["na", "eu"]);
    expect(m.slots.weapon).toEqual([
      { name: "C", share: 67.5 },
      { name: "A", share: 20 },
      { name: "B", share: 12.5 },
    ]);
  });
  it("keeps only the top 3 per slot", () => {
    const m = mergeUsage([part(10, "x", [["A", 40], ["B", 30], ["C", 20], ["D", 10]])]);
    expect(m.slots.weapon!.map((e) => e.name)).toEqual(["A", "B", "C"]);
  });
  it("produces data the schema accepts", () => {
    const m = mergeUsage([part(10, "https://gamewith.ai/x", [["A", 40]])]);
    expect(GearUsageSchema.safeParse({ region: "global", fetchedAt: "2026-10-07", classes: { ranger: m } }).success).toBe(true);
  });
});
