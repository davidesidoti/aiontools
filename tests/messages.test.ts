// tests/messages.test.ts
import { describe, it, expect } from "vitest";
import { createTranslator } from "next-intl";
import en from "../messages/en.json";
import it_ from "../messages/it.json";

describe("pluralized messages", () => {
  it("crafting.baseCrafts agrees with the count", () => {
    const tEn = createTranslator({ locale: "en", messages: en });
    const tIt = createTranslator({ locale: "it", messages: it_ });
    expect(tEn("crafting.baseCrafts", { count: 1 })).toBe("1 craft needed at 100% success");
    expect(tEn("crafting.baseCrafts", { count: 64 })).toBe("64 crafts needed at 100% success");
    expect(tIt("crafting.baseCrafts", { count: 1 })).toBe("1 craft necessario con successo al 100%");
    expect(tIt("crafting.baseCrafts", { count: 16 })).toBe("16 craft necessari con successo al 100%");
  });
});
