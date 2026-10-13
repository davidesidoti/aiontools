// src/lib/search.test.ts
import { describe, it, expect } from "vitest";
import { buildSearchIndex } from "./search";

const labels = { nav: (k: string) => `nav.${k}`, guide: (k: string) => `guide.${k}` };

describe("buildSearchIndex", () => {
  const items = buildSearchIndex("it", labels);
  it("has unique ids", () => {
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });
  it("includes every page with localized labels", () => {
    const pages = items.filter((i) => i.group === "pages");
    expect(pages.map((p) => p.href)).toEqual(["/", "/checklist", "/builds", "/crafting", "/guides", "/guides/content", "/guides/roadmap", "/guides/tips", "/guides/buffs", "/guides/links", "/settings"]);
    expect(pages.find((p) => p.href === "/guides/roadmap")!.label).toBe("guide.roadmap");
  });
  it("deep-links activities and roadmap phases", () => {
    expect(items.find((i) => i.id === "activity:nightmare")).toMatchObject({ href: "/guides/content#nightmare", label: "Nightmare" });
    expect(items.some((i) => i.group === "roadmap" && i.href.startsWith("/guides/roadmap#"))).toBe(true);
  });
  it("includes every class build", () => {
    const classes = items.filter((i) => i.group === "classes");
    expect(classes.map((c) => c.href)).toContain("/builds/spirit-master");
    expect(classes).toHaveLength(8);
  });
});
