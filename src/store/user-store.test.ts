// src/store/user-store.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useUserStore, STORAGE_KEY } from "./user-store";
import { createDefaultUserData } from "@/lib/user-data";
import { addCharacter } from "@/lib/characters";
import { getCount, setCount } from "@/lib/checklist";
import { ACTIVITIES } from "@/lib/activities";

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

  it("an edit made right after a reset survives the next reset tick", () => {
    const nightmare = ACTIVITIES.find((a) => a.id === "nightmare")!;
    useUserStore.getState().hydrate(now);
    useUserStore.getState().update((d) => addCharacter(d, { name: "A", classId: "chanter" }, "a"));
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-15T07:00:30.000Z")); // 30 s after the next daily reset, before the ticker ran
      useUserStore.getState().update((d) => setCount(d, "a", nightmare, 1));
      useUserStore.getState().tickResets(new Date("2026-10-15T07:00:50.000Z"));
      expect(getCount(useUserStore.getState().data, "a", nightmare)).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("re-reads storage when another tab writes it", () => {
    useUserStore.getState().hydrate(now);
    const other = addCharacter(createDefaultUserData(now), { name: "FromOtherTab", classId: "cleric" }, "o");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(other));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    expect(useUserStore.getState().data.characters.map((c) => c.name)).toEqual(["FromOtherTab"]);
  });
});
