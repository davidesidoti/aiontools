// src/lib/crafting.test.ts
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { CRAFTING, CRAFTING_TIPS, computeCrafting, setCraftingPrice, setCraftingRate, setCraftingTax, resetCrafting } from "./crafting";
import { createDefaultUserData } from "./user-data";

const none = { prices: {}, rates: {} };
const base = () => createDefaultUserData(new Date("2026-10-14T10:00:00.000Z"));

describe("computeCrafting", () => {
  it("matches the spreadsheet with default values", () => {
    const r = computeCrafting(CRAFTING, none);
    expect(r.subtotal).toBeCloseTo(27_706_944.27, 1);
    expect(r.taxAmount).toBeCloseTo(2_770_694.43, 1);
    expect(r.total).toBeCloseTo(30_477_638.7, 1);
    expect(r.tiers.map((t) => Math.round(t.total))).toEqual([552_352, 3_515_163, 7_640_021, 15_999_409]);
    expect(r.tiers[0].expectedCrafts).toBeCloseTo(68.7433, 3);
  });
  it("applies price, rate and tax overrides", () => {
    const r = computeCrafting(CRAFTING, { prices: { "common-material": 2000 }, rates: { common: 1 }, tax: 0 });
    expect(r.tiers[0].materials[0]).toMatchObject({ price: 2000, cost: 2000, expected: 128_000 });
    expect(r.tiers[0].expectedCrafts).toBe(64);
    expect(r.taxAmount).toBe(0);
    expect(Number.isFinite(r.total)).toBe(true);
  });
});

describe("crafting ops", () => {
  it("stores valid overrides", () => {
    let d = setCraftingPrice(base(), "common-material", 2500);
    d = setCraftingRate(d, "gold", 0.5);
    d = setCraftingTax(d, 0.05);
    expect(d.crafting).toEqual({ prices: { "common-material": 2500 }, rates: { gold: 0.5 }, tax: 0.05 });
    expect(resetCrafting(d).crafting).toEqual({ prices: {}, rates: {} });
  });
  it("rejects invalid values and unknown ids (same reference)", () => {
    const d = base();
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY]) expect(setCraftingPrice(d, "common-material", bad)).toBe(d);
    expect(setCraftingPrice(d, "nope", 10)).toBe(d);
    for (const bad of [0, -0.5, 1.01, Number.NaN]) expect(setCraftingRate(d, "common", bad)).toBe(d);
    expect(setCraftingRate(d, "nope", 0.5)).toBe(d);
    for (const bad of [-0.01, 1.5, Number.NaN]) expect(setCraftingTax(d, bad)).toBe(d);
  });
});

describe("crafting content", () => {
  it("has unique material ids and fully translated names", () => {
    const ids = CRAFTING.tiers.flatMap((t) => t.materials.map((m) => m.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of CRAFTING.tiers) expect(t.name.it.length).toBeGreaterThan(0);
  });
  it("tips reference existing images", () => {
    for (const img of CRAFTING_TIPS.images) expect(existsSync(join("public", img.src)), img.src).toBe(true);
    expect(CRAFTING_TIPS.carryOver).toHaveLength(8);
    expect(CRAFTING_TIPS.misc).toHaveLength(6);
  });
});
