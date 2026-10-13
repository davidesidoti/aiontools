// src/lib/build-parser.test.ts
import { describe, it, expect } from "vitest";
import cells from "../../tests/fixtures/ranger-cells.json";
import { parseClassTab, normName } from "./build-parser";

const b = parseClassTab(cells);

describe("parseClassTab (Ranger)", () => {
  it("reads skills with their priority notes", () => {
    expect(b.skills[0]).toEqual({ name: "Snipe", detail: "(20) - (3/4)" });
    expect(b.skills.find((s) => s.name === "Arrow Scattershot")).toEqual({ name: "Arrow Scattershot", detail: "N/A" });
    expect(b.skills).toHaveLength(12);
  });
  it("reads ranked passives and stigmas, fixing known typos", () => {
    expect(b.passives[0]).toEqual({ name: "Focused Eye", rank: 1 });
    expect(b.stigmas[0]).toEqual({ name: "Vaizel's Authority", rank: 1 });
    expect(b.stigmas.some((s) => s.name === "Explosive Arrow" && s.rank === undefined)).toBe(true);
  });
  it("splits equip effect targets", () => {
    expect(b.equipEffects[0].slice(0, 2)).toEqual(["Snipe", "Tempest Shot"]);
    expect(b.equipEffects.at(-1)).toEqual(["Endurance"]);
  });
  it("reads the five Daevanion boards", () => {
    expect(b.boards.map((x) => x.name)).toEqual(["Cogni", "Natura", "Special", "Fera", "Varian"]);
    expect(b.boards[0].lines[0]).toEqual({ lines: "1 & 5", priority: ["Max Attack", "Attack Bonus"] });
  });
  it("reads gear, titles, theostones, manastones and pantheon", () => {
    expect(b.titles.offensive[0]).toBe("Playing God");
    expect(b.titles.defensive).toContain("Rule All Creation");
    expect(b.manastones.length).toBeGreaterThan(2);
    expect(b.pantheon.colossus).toMatch(/Zikel/);
    expect(b.theostones).toMatch(/Poison/);
  });
  it("groups soul binding by slot", () => {
    expect(b.soulbind.map((g) => g.group)).toEqual(["Weaponary", "Armor", "Passive Accessories"]);
    expect(b.soulbind[0].slots[0].slot).toBe("Weapon");
    expect(b.soulbind[2].slots.map((s) => s.slot)).toContain("Seals");
  });
  it("collects links and notes", () => {
    expect(b.links.some((l) => l.url.startsWith("https://docs.google.com/"))).toBe(true);
    expect(b.notes.some((n) => n.startsWith("Option 1"))).toBe(true);
  });
  it("throws with the cell name when the layout changes", () => {
    expect(() => parseClassTab({ ...cells, A16: "Something else" })).toThrow(/A16/);
  });
  it("reports a soul binding slot that appears before any group", () => {
    expect(() => parseClassTab({ ...cells, B29: "Weaponary" })).toThrow(/A29/);
  });
  it("drops empty labels and one-word captions from notes", () => {
    const n = parseClassTab({ ...cells, A70: "Ranger guy (twitch/youtube):", A71: "Nezekan", D72: "Hold Down The Macro" }).notes;
    expect(n).not.toContain("Ranger guy (twitch/youtube):");
    expect(n).not.toContain("Nezekan");
    expect(n).toContain("Hold Down The Macro");
  });
  it("maps sheet typos to in-game names", () => {
    expect(parseClassTab({ ...cells, A3: "Dark Rush (20) - (3/4/5)" }).skills[0].name).toBe("Dark Crush");
  });
  it("normalizes names for matching", () => {
    expect(normName("Vaizel's Authority")).toBe("vaizelsauthority");
  });
});
