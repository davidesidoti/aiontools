// src/lib/guides.test.ts
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  CONTENT_GUIDE, GUIDE_BY_ID, ROADMAP, ROADMAP_STEP_IDS, TIPS, BUFFS, LINKS,
  filterGuide, guideFor, roadmapProgress, toggleRoadmapItem, type GuideFilter,
} from "./guides";
import { ACTIVITIES } from "./activities";
import { createDefaultUserData } from "./user-data";

const ALL: GuideFilter = { section: "all", mode: "all", scope: "all", q: "" };
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe("content guide data", () => {
  it("has the 24 activities of the sheet, by section", () => {
    expect(CONTENT_GUIDE).toHaveLength(24);
    const by = (s: string) => CONTENT_GUIDE.filter((e) => e.section === s).length;
    expect([by("daily"), by("weekly"), by("recharge"), by("misc")]).toEqual([1, 8, 6, 9]);
  });
  it("only references image files that exist", () => {
    for (const e of CONTENT_GUIDE) if (e.icon) expect(existsSync(join("public", e.icon)), e.icon).toBe(true);
    for (const img of TIPS.settings.images) expect(existsSync(join("public", img.src)), img.src).toBe(true);
    for (const img of TIPS.tips.flatMap((t) => t.images ?? [])) expect(existsSync(join("public", img.src)), img.src).toBe(true);
  });
  it("every explicit activity → guide link resolves", () => {
    for (const a of ACTIVITIES) if (a.guide) expect(GUIDE_BY_ID.has(a.guide), a.id).toBe(true);
    expect(guideFor(ACTIVITIES.find((a) => a.id === "shugo-festival-key")!)?.id).toBe("shugo-festival-reward-key");
    expect(guideFor(ACTIVITIES.find((a) => a.id === "conquest")!)).toBeUndefined();
  });
  it("buffs and links are populated", () => {
    expect(BUFFS.pairs).toHaveLength(3);
    expect(LINKS.classes.length).toBeGreaterThanOrEqual(7);
    expect(ROADMAP.phases.length).toBeGreaterThanOrEqual(5);
  });
  it("keeps the full shared URLs of class guide links", () => {
    const urls = LINKS.classes.flatMap((c) => c.guides.map((g) => g.url));
    expect(urls).toContain("https://ranger.tgustafsson.se/#board=zikel-44");
    expect(urls).toContain("https://assassin.tgustafsson.se/#skills=start");
    expect(urls.some((u) => u.endsWith("edit?tab=t.refyxxrthj80#heading=h.yd411wdum1y0"))).toBe(true);
  });
  it("gives Feathers a PvE mode so the PvE filter keeps it", () => {
    expect(GUIDE_BY_ID.get("feathers")!.modes).toEqual(["pve"]);
  });
  it("uses the sheet's wording, not invented references", () => {
    expect(TIPS.tips.find((t) => t.id === "tip-3")!.text.en).not.toMatch(/this guide/i);
    expect(GUIDE_BY_ID.get("nightmare")!.strategy.en).not.toMatch(/Buy in this order/);
  });
});

describe("content guide translations", () => {
  it("translates rewards and location too", () => {
    const di = GUIDE_BY_ID.get("dimensional-invasion")!;
    expect(di.where.it).toMatch(/minimappa/);
    expect(GUIDE_BY_ID.get("command-missions")!.rewards.it).toMatch(/Duty Missions/);
    expect(GUIDE_BY_ID.get("command-missions")!.rewards.it).not.toBe(GUIDE_BY_ID.get("command-missions")!.rewards.en);
  });
});

describe("filterGuide", () => {
  it("filters by section", () => {
    const r = ids(filterGuide(CONTENT_GUIDE, { ...ALL, section: "recharge" }, "en"));
    expect(r).toContain("nightmare");
    expect(r).not.toContain("duty-missions");
  });
  it("filters by mode and drops entries without one", () => {
    const r = filterGuide(CONTENT_GUIDE, { ...ALL, mode: "pvp" }, "en");
    expect(r.every((e) => e.modes.includes("pvp"))).toBe(true);
    expect(ids(r)).toContain("battlefield");
    expect(ids(r)).not.toContain("substance-morph");
  });
  it("alt scope excludes main-only activities", () => {
    const r = ids(filterGuide(CONTENT_GUIDE, { ...ALL, scope: "alt" }, "en"));
    expect(r).not.toContain("duty-missions");
    expect(r).toContain("nightmare");
  });
  it("searches names and localized text, case-insensitively", () => {
    expect(ids(filterGuide(CONTENT_GUIDE, { ...ALL, q: "NIGHTMARE" }, "en"))).toContain("nightmare");
    const it_ = GUIDE_BY_ID.get("duty-missions")!.strategy.it.split(" ").find((w) => w.length > 6)!;
    expect(ids(filterGuide(CONTENT_GUIDE, { ...ALL, q: it_.toUpperCase() }, "it"))).toContain("duty-missions");
  });
  it("returns an empty list when nothing matches", () => {
    expect(filterGuide(CONTENT_GUIDE, { ...ALL, q: "zzzz-no-match" }, "en")).toEqual([]);
  });
});

describe("roadmap progress", () => {
  const first = [...ROADMAP_STEP_IDS][0];
  it("counts only known steps", () => {
    expect(roadmapProgress([first, "old-removed-step"])).toEqual({ done: 1, total: ROADMAP_STEP_IDS.size });
  });
  it("toggles known steps and ignores unknown ids", () => {
    const d = createDefaultUserData(new Date("2026-10-14T10:00:00.000Z"));
    const on = toggleRoadmapItem(d, first);
    expect(on.roadmap.done).toEqual([first]);
    expect(toggleRoadmapItem(on, first).roadmap.done).toEqual([]);
    expect(toggleRoadmapItem(d, "old-removed-step")).toBe(d);
  });
});
