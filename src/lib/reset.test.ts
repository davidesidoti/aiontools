import { describe, it, expect } from "vitest";
import { lastResetAt, nextResetAt } from "./reset";

const d = (iso: string) => new Date(iso);

describe("lastResetAt — global (07:00 UTC, Wednesday)", () => {
  it("before today's reset returns yesterday 07:00", () => {
    expect(lastResetAt(d("2026-10-14T06:59:59.999Z"), "global", "day").toISOString()).toBe("2026-10-13T07:00:00.000Z");
  });
  it("exactly at reset counts as already reset", () => {
    expect(lastResetAt(d("2026-10-14T07:00:00.000Z"), "global", "day").toISOString()).toBe("2026-10-14T07:00:00.000Z");
  });
  it("weekly just before Wednesday reset returns previous Wednesday", () => {
    expect(lastResetAt(d("2026-10-14T06:59:59.999Z"), "global", "week").toISOString()).toBe("2026-10-07T07:00:00.000Z");
  });
  it("weekly at Wednesday reset returns that instant", () => {
    expect(lastResetAt(d("2026-10-14T07:00:00.000Z"), "global", "week").toISOString()).toBe("2026-10-14T07:00:00.000Z");
  });
  it("weekly on Sunday returns the Wednesday before", () => {
    expect(lastResetAt(d("2026-10-18T12:00:00.000Z"), "global", "week").toISOString()).toBe("2026-10-14T07:00:00.000Z");
  });
});

describe("lastResetAt — kr (05:00 UTC+9 = 20:00 UTC previous day)", () => {
  it("daily", () => {
    expect(lastResetAt(d("2026-10-13T19:59:59.999Z"), "kr", "day").toISOString()).toBe("2026-10-12T20:00:00.000Z");
    expect(lastResetAt(d("2026-10-13T20:00:00.000Z"), "kr", "day").toISOString()).toBe("2026-10-13T20:00:00.000Z");
  });
  it("weekly uses Korean-local Wednesday", () => {
    // 2026-10-13T20:00Z = Wed 2026-10-14 05:00 KST
    expect(lastResetAt(d("2026-10-13T20:00:00.000Z"), "kr", "week").toISOString()).toBe("2026-10-13T20:00:00.000Z");
    expect(lastResetAt(d("2026-10-13T19:59:00.000Z"), "kr", "week").toISOString()).toBe("2026-10-06T20:00:00.000Z");
  });
});

describe("lastResetAt — tw (05:00 UTC+8 = 21:00 UTC previous day)", () => {
  it("daily", () => {
    expect(lastResetAt(d("2026-10-13T21:30:00.000Z"), "tw", "day").toISOString()).toBe("2026-10-13T21:00:00.000Z");
  });
});

describe("nextResetAt", () => {
  it("is strictly after now", () => {
    expect(nextResetAt(d("2026-10-14T07:00:00.000Z"), "global", "day").toISOString()).toBe("2026-10-15T07:00:00.000Z");
    expect(nextResetAt(d("2026-10-14T06:00:00.000Z"), "global", "week").toISOString()).toBe("2026-10-14T07:00:00.000Z");
  });
});
