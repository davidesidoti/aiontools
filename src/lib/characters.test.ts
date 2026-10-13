// src/lib/characters.test.ts
import { describe, it, expect } from "vitest";
import { addCharacter, removeCharacter, restoreCharacter, setMain, updateCharacter, MAX_CHARACTERS } from "./characters";
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

describe("restoreCharacter", () => {
  const three = () => {
    let d = addCharacter(base(), { name: "A", classId: "chanter" }, "a");
    d = addCharacter(d, { name: "B", classId: "cleric" }, "b");
    d = addCharacter(d, { name: "C", classId: "cleric" }, "c");
    return setCount(d, "a", ACTIVITIES[0], 1);
  };
  it("re-inserts the character and progress into current data, keeping later edits", () => {
    const before = three();
    let d = removeCharacter(before, "a");
    d = setCount(d, "b", ACTIVITIES[0], 1);
    d = removeCharacter(d, "c");
    d = restoreCharacter(d, before, "a");
    expect(d.characters.map((c) => c.id)).toEqual(["a", "b"]);
    expect(d.checklist.progress.a).toEqual(before.checklist.progress.a);
    expect(d.checklist.progress.b?.[ACTIVITIES[0].id]).toBe(1);
    expect(d.characters.filter((c) => c.isMain)).toHaveLength(1);
    expect(UserDataSchema.safeParse(d).success).toBe(true);
  });
  it("gives back main only when no one else is main yet", () => {
    const before = three();
    const d = restoreCharacter(removeCharacter(before, "a"), before, "a");
    expect(d.characters.find((c) => c.isMain)!.id).toBe("b");
    const solo = addCharacter(base(), { name: "A", classId: "chanter" }, "a");
    expect(restoreCharacter(removeCharacter(solo, "a"), solo, "a").characters[0].isMain).toBe(true);
  });
  it("does nothing if the character is already back or the roster is full", () => {
    const before = three();
    expect(restoreCharacter(before, before, "a")).toBe(before);
    let full = removeCharacter(before, "a");
    for (let i = full.characters.length; i < MAX_CHARACTERS; i++) full = addCharacter(full, { name: `X${i}`, classId: "cleric" }, `x${i}`);
    expect(restoreCharacter(full, before, "a")).toBe(full);
  });
});
