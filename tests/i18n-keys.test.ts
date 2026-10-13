// tests/i18n-keys.test.ts
import { describe, it, expect } from "vitest";
import en from "../messages/en.json";
import it_ from "../messages/it.json";

const keys = (o: object, p = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));

describe("messages", () => {
  it("it.json has exactly the keys of en.json", () => {
    expect(keys(it_).sort()).toEqual(keys(en).sort());
  });
});
