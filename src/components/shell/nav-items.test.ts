// src/components/shell/nav-items.test.ts
import { describe, it, expect } from "vitest";
import { isNavActive, navAriaCurrent } from "./nav-items";

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

describe("navAriaCurrent", () => {
  it("is 'page' only on the exact page and 'true' on its parent section", () => {
    expect(navAriaCurrent("/guides", "/guides")).toBe("page");
    expect(navAriaCurrent("/guides/roadmap", "/guides")).toBe("true");
    expect(navAriaCurrent("/crafting", "/guides")).toBeUndefined();
  });
});
