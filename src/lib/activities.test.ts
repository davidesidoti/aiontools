// src/lib/activities.test.ts
import { describe, it, expect } from "vitest";
import { ACTIVITIES, maxFor, resetPeriod, localize, type Activity } from "./activities";

const byId = (id: string) => ACTIVITIES.find((a) => a.id === id)!;

describe("ACTIVITIES content", () => {
  it("has unique ids", () => {
    const ids = ACTIVITIES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("covers all three sections", () => {
    expect(new Set(ACTIVITIES.map((a) => a.section))).toEqual(new Set(["daily", "weekly", "recharge"]));
  });
});

describe("maxFor", () => {
  it("main-only activity is 0 for alts", () => {
    expect(maxFor(byId("duty-missions"), true)).toBe(5);
    expect(maxFor(byId("duty-missions"), false)).toBe(0);
  });
  it("uses altMax for alts when present", () => {
    expect(maxFor(byId("substance-morph"), true)).toBe(20);
    expect(maxFor(byId("substance-morph"), false)).toBe(4);
  });
  it("recharge uses perDay", () => {
    expect(maxFor(byId("nightmare"), false)).toBe(2);
  });
});

describe("resetPeriod", () => {
  it("weekly activities reset weekly, recharge daily", () => {
    expect(resetPeriod(byId("daily-dungeon"))).toBe("week");
    expect(resetPeriod(byId("shugo-festival-key"))).toBe("day");
  });
});

describe("localize", () => {
  it("falls back to en", () => {
    expect(localize({ en: "Hi" }, "it")).toBe("Hi");
    expect(localize({ en: "Hi", it: "Ciao" }, "it")).toBe("Ciao");
  });
});

it("Activity type rejects nothing at runtime here", () => {
  const a: Activity = byId("battlefield");
  expect(a.scope).toBe("both");
});
