// src/lib/format.test.ts
import { describe, it, expect } from "vitest";
import { formatCountdown } from "./format";

const u = { d: "d", h: "h", m: "m" };
const H = 3_600_000;

describe("formatCountdown", () => {
  it("days and hours when ≥ 1 day", () => expect(formatCountdown(26 * H + 5 * 60_000, u)).toBe("1d 2h"));
  it("hours and minutes when ≥ 1 hour", () => expect(formatCountdown(3 * H + 12 * 60_000, u)).toBe("3h 12m"));
  it("minutes only, rounded up, never 0", () => {
    expect(formatCountdown(61_000, u)).toBe("2m");
    expect(formatCountdown(500, u)).toBe("1m");
  });
  it("uses localized units", () => expect(formatCountdown(26 * H, { d: "g", h: "h", m: "m" })).toBe("1g 2h"));
});
