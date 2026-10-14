// src/lib/events.test.ts
import { describe, it, expect } from "vitest";
import { nextOccurrence, eventStatus, EVENTS, EVENTS_META, type Rule } from "./events";
import { zonedInstant } from "./tz";
import { eventTimeZone, REGION_IDS } from "./regions";

const RIFT: Rule = { kind: "fixed", times: ["02:00", "05:00", "08:00", "11:00", "14:00", "17:00", "20:00", "23:00"] };
const at = (iso: string) => new Date(iso);
const next = (rule: Rule, tz: string, now: string, dur = 10) => nextOccurrence(rule, tz, at(now), dur).toISOString();

describe("zonedInstant", () => {
  it("takes the first instance of the repeated autumn hour (Berlin, 2026-10-25 02:30)", () => {
    expect(new Date(zonedInstant(2026, 10, 25, 2, 30, "Europe/Berlin")).toISOString()).toBe("2026-10-25T00:30:00.000Z");
  });
  it("shifts a time inside the spring gap forward (Berlin, 2027-03-28 02:30 → 03:30 CEST)", () => {
    expect(new Date(zonedInstant(2027, 3, 28, 2, 30, "Europe/Berlin")).toISOString()).toBe("2027-03-28T01:30:00.000Z");
  });
});

describe("nextOccurrence", () => {
  it("Rift in Berlin just before the switch: the 02:00 slot is the CEST one", () => {
    expect(next(RIFT, "Europe/Berlin", "2026-10-24T22:10:00Z")).toBe("2026-10-25T00:00:00.000Z");
  });
  it("Rift in Berlin after the switch follows CET", () => {
    expect(next(RIFT, "Europe/Berlin", "2026-10-25T03:00:00Z")).toBe("2026-10-25T04:00:00.000Z");
  });
  it("Rift in New York across the US switch", () => {
    expect(next(RIFT, "America/New_York", "2026-10-31T13:00:00Z")).toBe("2026-10-31T15:00:00.000Z"); // 11:00 EDT
    expect(next(RIFT, "America/New_York", "2026-11-01T12:00:00Z")).toBe("2026-11-01T13:00:00.000Z"); // 08:00 EST
  });
  it("Rift in Seoul (no DST)", () => {
    expect(next(RIFT, "Asia/Seoul", "2026-10-14T00:00:00Z")).toBe("2026-10-14T02:00:00.000Z"); // 11:00 KST
  });
  it("an hourly rule at :30 returns the current start while still open, the next one after", () => {
    const rule: Rule = { kind: "hourly", minute: 30 };
    expect(next(rule, "Europe/Berlin", "2026-10-14T10:40:00Z", 15)).toBe("2026-10-14T10:30:00.000Z");
    expect(next(rule, "Europe/Berlin", "2026-10-14T10:40:00Z", 5)).toBe("2026-10-14T11:30:00.000Z");
  });
  it("an hourly rule fires in both copies of the repeated autumn hour (Berlin, 2026-10-25)", () => {
    const rule: Rule = { kind: "hourly", minute: 0 };
    expect(next(rule, "Europe/Berlin", "2026-10-25T00:15:00Z")).toBe("2026-10-25T01:00:00.000Z");
  });
  it("a fixed rule with days skips to the next allowed weekday", () => {
    const siege: Rule = { kind: "fixed", days: [1, 4, 6], times: ["21:00"] };
    expect(next(siege, "Europe/Berlin", "2026-10-14T12:00:00Z", 30)).toBe("2026-10-15T19:00:00.000Z"); // Thu 21:00 CEST
  });
});

describe("eventStatus", () => {
  const siege = EVENTS.find((e) => e.id === "siege")!;
  it("is open inside the window", () => {
    const s = eventStatus(siege, "global", "eu", at("2026-10-15T19:10:00Z"));
    expect(s).toEqual({ start: at("2026-10-15T19:00:00Z"), end: at("2026-10-15T19:30:00Z"), open: true });
  });
  it("moves to the next start the minute the window ends", () => {
    const s = eventStatus(siege, "global", "eu", at("2026-10-15T19:30:00Z"));
    expect(s.open).toBe(false);
    expect(s.start.toISOString()).toBe("2026-10-17T19:00:00.000Z"); // Sat 21:00 CEST
  });
  it("uses the server's zone for Global", () => {
    expect(eventTimeZone("global", "na-west")).toBe("America/Los_Angeles");
    expect(eventTimeZone("kr", "na-west")).toBe("Asia/Seoul");
  });
});

describe("events file", () => {
  it("has the five events, each with a rule for every region", () => {
    expect(EVENTS.map((e) => e.id).sort()).toEqual(["invasion", "nahma", "rift", "shugo", "siege"]);
    for (const e of EVENTS) for (const r of REGION_IDS) expect(e.schedule[r], `${e.id}/${r}`).toBeDefined();
    expect(EVENTS_META.sources.length).toBeGreaterThan(0);
  });
});
