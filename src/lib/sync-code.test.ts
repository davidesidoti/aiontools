// src/lib/sync-code.test.ts
import { describe, it, expect } from "vitest";
import { generateSyncCode, normalizeSyncCode, SYNC_CODE_RE } from "./sync-code";

describe("sync codes", () => {
  it("generates codes matching the format", () => {
    for (let i = 0; i < 200; i++) expect(generateSyncCode()).toMatch(SYNC_CODE_RE);
  });
  it("is deterministic with an injected random source", () => {
    expect(generateSyncCode(() => 0)).toBe("abandon-abandon-abandon-0000");
  });
  it("does not repeat across many draws", () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateSyncCode()));
    expect(codes.size).toBe(1000);
  });
  it("normalizes typed input", () => {
    expect(normalizeSyncCode("  Wolf-Amber-River-7421 ")).toBe("wolf-amber-river-7421");
  });
  it("rejects malformed codes", () => {
    for (const bad of ["", "abc", "wolf-amber-river-742", "wolf-amber-7421", "wolf,amber-river-7421", "Wolf-amber-river-7421"]) {
      expect(SYNC_CODE_RE.test(bad)).toBe(false);
    }
  });
});
