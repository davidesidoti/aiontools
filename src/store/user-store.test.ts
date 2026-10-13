// src/store/user-store.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useUserStore, STORAGE_KEY } from "./user-store";
import { createDefaultUserData } from "@/lib/user-data";
import { addCharacter } from "@/lib/characters";

const now = new Date("2026-10-14T10:00:00.000Z");

beforeEach(() => {
  localStorage.clear();
  useUserStore.setState({ data: createDefaultUserData(now), hydrated: false, corrupted: false });
  vi.restoreAllMocks();
});

describe("useUserStore", () => {
  it("hydrates defaults on first visit", () => {
    useUserStore.getState().hydrate(now);
    expect(useUserStore.getState()).toMatchObject({ hydrated: true, corrupted: false });
  });

  it("backs up corrupt storage and starts fresh", () => {
    localStorage.setItem(STORAGE_KEY, "{bad");
    useUserStore.getState().hydrate(now);
    expect(useUserStore.getState().corrupted).toBe(true);
    expect(localStorage.getItem(`aiontools-backup-${now.getTime()}`)).toBe("{bad");
  });

  it("persists user edits and bumps updatedAt", () => {
    useUserStore.getState().hydrate(now);
    const before = useUserStore.getState().data.updatedAt;
    useUserStore.getState().update((d) => addCharacter(d, { name: "A", classId: "chanter" }, "a"));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.characters[0].name).toBe("A");
    expect(saved.updatedAt).not.toBe(before);
  });

  it("does not write when update returns same reference", () => {
    useUserStore.getState().hydrate(now);
    const spy = vi.spyOn(Storage.prototype, "setItem");
    useUserStore.getState().update((d) => d);
    expect(spy).not.toHaveBeenCalled();
  });

  it("tickResets does not bump updatedAt", () => {
    useUserStore.getState().hydrate(now);
    const before = useUserStore.getState().data.updatedAt;
    useUserStore.getState().tickResets(new Date("2026-10-15T08:00:00.000Z"));
    expect(useUserStore.getState().data.updatedAt).toBe(before);
    expect(useUserStore.getState().data.checklist.lastDaily).toBe("2026-10-15T07:00:00.000Z");
  });

  it("survives a throwing localStorage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });
    expect(() => useUserStore.getState().hydrate(now)).not.toThrow();
    expect(() => useUserStore.getState().update((d) => addCharacter(d, { name: "A", classId: "chanter" }))).not.toThrow();
    expect(useUserStore.getState().data.characters).toHaveLength(1);
  });
});
