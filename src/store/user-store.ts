// src/store/user-store.ts
import { create } from "zustand";
import { createDefaultUserData, parseStored, type UserData } from "@/lib/user-data";
import { applyResets } from "@/lib/checklist";
import { ACTIVITIES } from "@/lib/activities";

export const STORAGE_KEY = "aiontools:user-data";

type UserStore = {
  data: UserData;
  hydrated: boolean;
  corrupted: boolean;
  hydrate(now?: Date): void;
  update(fn: (d: UserData) => UserData): void;
  tickResets(now?: Date): void;
};

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable or full: keep working in memory.
  }
}

export const useUserStore = create<UserStore>()((set, get) => ({
  data: createDefaultUserData(new Date()),
  hydrated: false,
  corrupted: false,
  hydrate(now = new Date()) {
    const raw = read(STORAGE_KEY);
    const { data, corrupted } = parseStored(raw, now);
    if (corrupted && raw !== null) write(`aiontools-backup-${now.getTime()}`, raw);
    set({ data: applyResets(data, now, ACTIVITIES), hydrated: true, corrupted });
  },
  update(fn) {
    // Apply any reset that passed since the last tick, so the edit lands in the current window.
    get().tickResets();
    const prev = get().data;
    const next = fn(prev);
    if (next !== prev) set({ data: { ...next, updatedAt: new Date().toISOString() } });
  },
  tickResets(now = new Date()) {
    const prev = get().data;
    const next = applyResets(prev, now, ACTIVITIES);
    if (next !== prev) set({ data: next });
  },
}));

useUserStore.subscribe((state, prev) => {
  if (state.hydrated && state.data !== prev.data) write(STORAGE_KEY, JSON.stringify(state.data));
});

// Another tab saved: reload so this tab's stale state never overwrites it.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY && useUserStore.getState().hydrated) useUserStore.getState().hydrate();
  });
}
