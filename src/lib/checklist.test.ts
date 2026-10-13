// src/lib/checklist.test.ts
import { describe, it, expect } from "vitest";
import { applyResets, getCount, setCount, progressFor } from "./checklist";
import { addCharacter } from "./characters";
import { createDefaultUserData, setRegion, setSettings, type UserData } from "./user-data";
import { lastResetAt } from "./reset";
import { ACTIVITIES } from "./activities";

const a = (id: string) => ACTIVITIES.find((x) => x.id === id)!;
const t0 = new Date("2026-10-14T10:00:00.000Z"); // Wed, after reset

function withChars(): UserData {
  let d = createDefaultUserData(t0);
  d = addCharacter(d, { name: "Main", classId: "chanter" }, "m");
  d = addCharacter(d, { name: "Alt", classId: "cleric" }, "x");
  return d;
}

describe("setCount / getCount", () => {
  it("clamps to 0..max", () => {
    let d = setCount(withChars(), "m", a("duty-missions"), 99);
    expect(getCount(d, "m", a("duty-missions"))).toBe(5);
    d = setCount(d, "m", a("duty-missions"), -3);
    expect(getCount(d, "m", a("duty-missions"))).toBe(0);
  });
  it("is a no-op (same reference) for main-only activity on an alt", () => {
    const d = withChars();
    expect(setCount(d, "x", a("duty-missions"), 1)).toBe(d);
  });
  it("is a no-op for unknown character", () => {
    const d = withChars();
    expect(setCount(d, "nope", a("nightmare"), 1)).toBe(d);
  });
  it("getCount clamps a stored count above the alt max", () => {
    let d = setCount(withChars(), "m", a("substance-morph"), 15);
    d = { ...d, characters: d.characters.map((c) => ({ ...c, isMain: c.id === "x" })) };
    expect(getCount(d, "m", a("substance-morph"))).toBe(4);
  });
});

describe("applyResets", () => {
  it("returns same reference when nothing to reset", () => {
    const d = withChars();
    expect(applyResets(d, t0, ACTIVITIES)).toBe(d);
  });
  it("daily reset clears daily and recharge, keeps weekly", () => {
    let d = withChars();
    d = setCount(d, "m", a("duty-missions"), 3);
    d = setCount(d, "m", a("nightmare"), 2);
    d = setCount(d, "m", a("battlefield"), 2);
    const r = applyResets(d, new Date("2026-10-15T07:00:00.000Z"), ACTIVITIES);
    expect(getCount(r, "m", a("duty-missions"))).toBe(0);
    expect(getCount(r, "m", a("nightmare"))).toBe(0);
    expect(getCount(r, "m", a("battlefield"))).toBe(2);
    expect(r.checklist.lastDaily).toBe("2026-10-15T07:00:00.000Z");
    expect(r.updatedAt).toBe(d.updatedAt);
  });
  it("after 3 weeks away resets both once and is idempotent", () => {
    const d = setCount(withChars(), "m", a("battlefield"), 2);
    const later = new Date("2026-11-04T12:00:00.000Z");
    const r1 = applyResets(d, later, ACTIVITIES);
    expect(getCount(r1, "m", a("battlefield"))).toBe(0);
    expect(r1.checklist.lastWeekly).toBe("2026-11-04T07:00:00.000Z");
    expect(applyResets(r1, later, ACTIVITIES)).toBe(r1);
  });
});

describe("progressFor", () => {
  it("sums only applicable activities", () => {
    const d = setCount(withChars(), "x", a("nightmare"), 1);
    const p = progressFor(d, "x", ACTIVITIES, ["recharge"]);
    // alt: nightmare(2) + transcendence(1) + conquest(1); shugo & dimensional are main-only
    expect(p).toEqual({ done: 1, total: 4 });
  });
});

describe("setRegion", () => {
  it("keeps progress made in the current window when switching region", () => {
    const at = new Date("2026-10-14T12:00:00.000Z"); // Wed: KR reset was 2026-10-13T20:00Z, global reset 2026-10-14T07:00Z
    let d = setSettings(createDefaultUserData(at), { region: "kr" });
    d = { ...d, checklist: { ...d.checklist, lastDaily: lastResetAt(at, "kr", "day").toISOString(), lastWeekly: lastResetAt(at, "kr", "week").toISOString() } };
    d = addCharacter(d, { name: "A", classId: "chanter" }, "a");
    d = setCount(d, "a", a("nightmare"), 2);
    d = setCount(d, "a", a("battlefield"), 1);
    const g = setRegion(d, "global", at);
    expect(g.settings.region).toBe("global");
    expect(getCount(applyResets(g, at, ACTIVITIES), "a", a("nightmare"))).toBe(2);
    expect(getCount(applyResets(g, at, ACTIVITIES), "a", a("battlefield"))).toBe(1);
    expect(getCount(applyResets(g, new Date("2026-10-15T07:00:00.000Z"), ACTIVITIES), "a", a("nightmare"))).toBe(0);
  });
  it("is a no-op for the same region", () => {
    const d = createDefaultUserData(t0);
    expect(setRegion(d, "global", t0)).toBe(d);
  });
});
