// src/lib/crafting.ts
import { z } from "zod";
import defaultsRaw from "@content/crafting.json";
import tipsRaw from "@content/crafting-tips.json";
import { FullTextSchema } from "./text";
import type { UserData } from "./user-data";

const Asset = z.string().regex(/^\/guides\/[a-z0-9/-]+\.(png|jpe?g|webp|gif)$/);

const CraftingDefaultsSchema = z.object({
  tax: z.number().min(0).max(1),
  tiers: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z]+$/),
        name: FullTextSchema,
        crafts: z.number().positive(),
        defaultRate: z.number().gt(0).max(1),
        materials: z
          .array(z.object({ id: z.string().regex(/^[a-z0-9-]+$/), name: z.string().min(1), qty: z.number().positive(), defaultPrice: z.number().min(0) }))
          .min(1),
      }),
    )
    .min(1),
});
export type CraftingDefaults = z.infer<typeof CraftingDefaultsSchema>;

const CraftingTipsSchema = z.object({
  base: z.array(z.object({ tier: FullTextSchema, item: z.string().min(1), needed: z.number().int().positive().optional() })),
  transfer: z.array(z.object({ item: z.string().min(1), result: z.string().min(1).nullable() })),
  carryOver: z.array(z.object({ label: FullTextSchema, carries: z.boolean() })),
  misc: z.array(FullTextSchema),
  images: z.array(z.object({ src: Asset, label: FullTextSchema })),
});
export type CraftingTips = z.infer<typeof CraftingTipsSchema>;

export const CRAFTING = CraftingDefaultsSchema.parse(defaultsRaw);
export const CRAFTING_TIPS = CraftingTipsSchema.parse(tipsRaw);

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

// Formulas from the sheet: cost = qty × price; expected crafts = crafts / rate; total = Σ tiers × (1 + tax).
export function computeCrafting(defaults: CraftingDefaults, overrides: UserData["crafting"]) {
  const tiers = defaults.tiers.map((t) => {
    const rate = overrides.rates[t.id] ?? t.defaultRate;
    const expectedCrafts = t.crafts / rate;
    const materials = t.materials.map((m) => {
      const price = overrides.prices[m.id] ?? m.defaultPrice;
      const cost = m.qty * price;
      return { id: m.id, name: m.name, qty: m.qty, price, cost, expected: cost * expectedCrafts };
    });
    return { id: t.id, name: t.name, crafts: t.crafts, rate, expectedCrafts, materials, total: sum(materials.map((m) => m.expected)) };
  });
  const subtotal = sum(tiers.map((t) => t.total));
  const tax = overrides.tax ?? defaults.tax;
  return { tiers, subtotal, tax, taxAmount: subtotal * tax, total: subtotal * (1 + tax) };
}
export type CraftingResult = ReturnType<typeof computeCrafting>;

const MATERIAL_IDS = new Set(CRAFTING.tiers.flatMap((t) => t.materials.map((m) => m.id)));
const TIER_IDS = new Set(CRAFTING.tiers.map((t) => t.id));

export function setCraftingPrice(data: UserData, materialId: string, price: number): UserData {
  if (!MATERIAL_IDS.has(materialId) || !Number.isFinite(price) || price < 0) return data;
  return { ...data, crafting: { ...data.crafting, prices: { ...data.crafting.prices, [materialId]: price } } };
}

export function setCraftingRate(data: UserData, tierId: string, rate: number): UserData {
  if (!TIER_IDS.has(tierId) || !Number.isFinite(rate) || rate <= 0 || rate > 1) return data;
  return { ...data, crafting: { ...data.crafting, rates: { ...data.crafting.rates, [tierId]: rate } } };
}

export function setCraftingTax(data: UserData, tax: number): UserData {
  if (!Number.isFinite(tax) || tax < 0 || tax > 1) return data;
  return { ...data, crafting: { ...data.crafting, tax } };
}

export function resetCrafting(data: UserData): UserData {
  return { ...data, crafting: { prices: {}, rates: {} } };
}
