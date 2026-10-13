// src/lib/accent-boot.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { ACCENT_BOOT } from "./accent-boot";

const run = () => new Function(ACCENT_BOOT)();

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.accent;
});

describe("accent boot script", () => {
  it("applies the stored Asmodian accent before React loads", () => {
    localStorage.setItem("aiontools:user-data", JSON.stringify({ settings: { accent: "asmodian" } }));
    run();
    expect(document.documentElement.dataset.accent).toBe("asmodian");
  });
  it("ignores missing, corrupt or unknown values without throwing", () => {
    expect(run).not.toThrow();
    localStorage.setItem("aiontools:user-data", "{bad");
    expect(run).not.toThrow();
    localStorage.setItem("aiontools:user-data", JSON.stringify({ settings: { accent: "<script>" } }));
    run();
    expect(document.documentElement.dataset.accent).toBeUndefined();
  });
});
