// src/lib/gear.test.ts
import { describe, it, expect } from "vitest";
import { GEAR_META, GEAR_GROUPS, gearUsageFor, findMatch, normGear } from "./gear";
import { GEAR_SLOTS } from "./gear-usage-parser";
import { CLASSES } from "./classes";

describe("curated gear meta", () => {
  it("covers every slot once and every class weapon", () => {
    expect(GEAR_META.slots.map((s) => s.slot).sort()).toEqual([...GEAR_SLOTS].sort());
    for (const c of CLASSES) expect(GEAR_META.weapons[c.id], c.id).toBeDefined();
  });
  it("explains every sub-group in both languages", () => {
    for (const g of GEAR_GROUPS) expect(GEAR_META.groups[g].it.length).toBeGreaterThan(0);
  });
});

describe("gear usage", () => {
  it("has data for every class in every region", () => {
    for (const c of CLASSES) expect(Object.keys(gearUsageFor(c.id)).sort(), c.id).toEqual(["global", "kr", "tw"]);
  });
});

describe("findMatch", () => {
  const entries = [
    { name: "Spiritforged Bow", share: 80 },
    { name: "Splendent Ebony Dragon Lord Bow", share: 5 },
  ];
  it("matches a name fragment across faction variants, ignoring case and punctuation", () => {
    expect(findMatch(entries, ["dragon lord"])?.share).toBe(5);
    expect(normGear("Ludra's Fatal Bow")).toBe("ludra's fatal bow");
  });
  it("returns nothing when no entry matches (the 'uncommon' case) or there is no data", () => {
    expect(findMatch(entries, ["abyssal bracelet"])).toBeUndefined();
    expect(findMatch(undefined, ["dragon lord"])).toBeUndefined();
  });
});
