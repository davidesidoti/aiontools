// src/lib/builds-i18n.test.ts
import { describe, it, expect } from "vitest";
import glossary from "@content/builds/it.json";
import { BUILD_PHRASES, buildText } from "./builds";

describe("build phrase glossary", () => {
  it("translates every free-text phrase of every build", () => {
    const missing = BUILD_PHRASES.filter((p) => !(glossary as Record<string, string>)[p]);
    expect(missing).toEqual([]);
  });
  it("falls back to English for unknown text and for en", () => {
    expect(buildText("Some new sentence", "it")).toBe("Some new sentence");
    expect(buildText(BUILD_PHRASES[0], "en")).toBe(BUILD_PHRASES[0]);
    expect(buildText(BUILD_PHRASES[0], "it")).not.toBe("");
  });
  it("has no stale entries", () => {
    expect(Object.keys(glossary).filter((k) => !BUILD_PHRASES.includes(k))).toEqual([]);
  });
});
