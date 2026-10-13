// src/lib/characters.test.ts
import { describe, it, expect } from "vitest";
import { addCharacter, removeCharacter, setMain, updateCharacter, MAX_CHARACTERS } from "./characters";
import { setCount } from "./checklist";
import { createDefaultUserData, UserDataSchema } from "./user-data";
import { ACTIVITIES } from "./activities";

const now = new Date("2026-10-14T10:00:00.000Z");
const base = () => createDefaultUserData(now);

describe("addCharacter", () => {
  it("first is main, next are alts", () => {
    let d = addCharacter(base(), { name: " A ", classId: "chanter" }, "a");
    d = addCharacter(d, { name: "B", classId: "cleric" }, "b");
    expect(d.characters).toEqual([
      { id: "a", name: "A", classId: "chanter", isMain: true },
      { id: "b", name: "B", classId: "cleric", isMain: false },
    ]);
  });
  it("ignores empty names and the 10th character", () => {
    const d = base();
    expect(addCharacter(d, { name: "   ", classId: "chanter" })).toBe(d);
    let full = d;
    for (let i = 0; i < MAX_CHARACTERS; i++) full = addCharacter(full, { name: `C${i}`, classId: "chanter" }, `c${i}`);
    expect(addCharacter(full, { name: "Z", classId: "chanter" })).toBe(full);
  });
  it("truncates names to 32 chars", () => {
    const d = addCharacter(base(), { name: "x".repeat(40), classId: "chanter" }, "a");
    expect(d.characters[0].name).toHaveLength(32);
  });
});

describe("removeCharacter", () => {
  it("promotes next character when main is removed and drops progress", () => {
    let d = addCharacter(base(), { name: "A", classId: "chanter" }, "a");
    d = addCharacter(d, { name: "B", classId: "cleric" }, "b");
    d = setCount(d, "a", ACTIVITIES[0], 1);
    d = removeCharacter(d, "a");
    expect(d.characters).toEqual([{ id: "b", name: "B", classId: "cleric", isMain: true }]);
    expect(d.checklist.progress.a).toBeUndefined();
    expect(UserDataSchema.safeParse(d).success).toBe(true);
  });
});

describe("setMain / updateCharacter", () => {
  it("keeps exactly one main", () => {
    let d = addCharacter(base(), { name: "A", classId: "chanter" }, "a");
    d = addCharacter(d, { name: "B", classId: "cleric" }, "b");
    d = setMain(d, "b");
    expect(d.characters.map((c) => c.isMain)).toEqual([false, true]);
  });
  it("ignores empty name updates", () => {
    const d = addCharacter(base(), { name: "A", classId: "chanter" }, "a");
    expect(updateCharacter(d, "a", { name: "  " })).toBe(d);
    expect(updateCharacter(d, "a", { name: "New", classId: "ranger" }).characters[0]).toMatchObject({ name: "New", classId: "ranger" });
  });
});
