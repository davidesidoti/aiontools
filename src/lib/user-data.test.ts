// src/lib/user-data.test.ts
import { describe, it, expect } from "vitest";
import { createDefaultUserData, parseStored, parseImported, setSettings, UserDataSchema, MAX_IMPORT_CHARS } from "./user-data";

const now = new Date("2026-10-14T10:00:00.000Z");

describe("createDefaultUserData", () => {
  it("is valid and anchored to the current reset window", () => {
    const d = createDefaultUserData(now);
    expect(UserDataSchema.safeParse(d).success).toBe(true);
    expect(d.checklist.lastDaily).toBe("2026-10-14T07:00:00.000Z");
    expect(d.checklist.lastWeekly).toBe("2026-10-14T07:00:00.000Z");
    expect(d.settings).toEqual({ region: "global", server: "eu", accent: "elyos", onboarded: false });
  });
});

describe("parseStored", () => {
  it("null means first visit, not corrupted", () => {
    expect(parseStored(null, now).corrupted).toBe(false);
  });
  it("round-trips valid data", () => {
    const d = createDefaultUserData(now);
    expect(parseStored(JSON.stringify(d), now)).toEqual({ data: d, corrupted: false });
  });
  it("invalid JSON is corrupted and falls back to defaults", () => {
    const r = parseStored("{bad", now);
    expect(r.corrupted).toBe(true);
    expect(r.data).toEqual(createDefaultUserData(now));
  });
  it("unknown version is corrupted", () => {
    const d = { ...createDefaultUserData(now), version: 99 };
    expect(parseStored(JSON.stringify(d), now).corrupted).toBe(true);
  });
});

describe("parseImported", () => {
  it("accepts a valid export", () => {
    const d = createDefaultUserData(now);
    expect(parseImported(JSON.stringify(d))).toEqual(d);
  });
  it("rejects invalid JSON, wrong shape and oversized input", () => {
    expect(parseImported("not json")).toBeNull();
    expect(parseImported(JSON.stringify({ hello: "world" }))).toBeNull();
    expect(parseImported(" ".repeat(MAX_IMPORT_CHARS + 1))).toBeNull();
  });
  it("rejects a character list without exactly one main", () => {
    const d = createDefaultUserData(now);
    d.characters = [{ id: "a", name: "A", classId: "chanter", isMain: false }];
    expect(parseImported(JSON.stringify(d))).toBeNull();
  });
});

describe("setSettings", () => {
  it("merges a patch", () => {
    const d = setSettings(createDefaultUserData(now), { region: "kr" });
    expect(d.settings.region).toBe("kr");
    expect(d.settings.accent).toBe("elyos");
  });
});

describe("character ids", () => {
  it("rejects duplicate character ids", () => {
    const d = createDefaultUserData(now);
    d.characters = [
      { id: "a", name: "A", classId: "chanter", isMain: true },
      { id: "a", name: "B", classId: "cleric", isMain: false },
    ];
    expect(parseImported(JSON.stringify(d))).toBeNull();
  });
  it("rejects ids with commas or spaces", () => {
    const d = createDefaultUserData(now);
    d.characters = [{ id: "a,b", name: "A", classId: "chanter", isMain: true }];
    expect(parseImported(JSON.stringify(d))).toBeNull();
    d.characters = [{ id: "a b", name: "A", classId: "chanter", isMain: true }];
    expect(parseImported(JSON.stringify(d))).toBeNull();
  });
});

describe("server setting", () => {
  it("stored or synced data without a server loads as EU, not as corrupt", () => {
    const d = createDefaultUserData(now);
    const oldSettings = { region: d.settings.region, accent: d.settings.accent, onboarded: d.settings.onboarded };
    const { data, corrupted } = parseStored(JSON.stringify({ ...d, settings: oldSettings }), now);
    expect(corrupted).toBe(false);
    expect(data.settings.server).toBe("eu");
  });
  it("rejects an unknown server", () => {
    const d = createDefaultUserData(now);
    expect(parseStored(JSON.stringify({ ...d, settings: { ...d.settings, server: "mars" } }), now).corrupted).toBe(true);
  });
  it("setSettings changes only the server", () => {
    const d = createDefaultUserData(now);
    expect(setSettings(d, { server: "na-west" }).settings).toEqual({ ...d.settings, server: "na-west" });
  });
});
