// src/components/shell/nav-items.test.ts
import { describe, it, expect } from "vitest";
import { isNavActive } from "./nav-items";

describe("isNavActive", () => {
  it("matches home only exactly", () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/guides", "/")).toBe(false);
  });
  it("matches a section and its sub-pages", () => {
    expect(isNavActive("/guides", "/guides")).toBe(true);
    expect(isNavActive("/guides/roadmap", "/guides")).toBe(true);
    expect(isNavActive("/guidesx", "/guides")).toBe(false);
  });
});
