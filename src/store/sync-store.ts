// src/store/sync-store.ts
import { create } from "zustand";
import { useUserStore } from "./user-store";
import type { UserData } from "@/lib/user-data";
import { normalizeSyncCode, SYNC_CODE_RE } from "@/lib/sync-code";
import { createRemote, deleteRemote, fetchRemote, pushRemote, type SyncError } from "@/lib/sync-client";

export const SYNC_KEY = "aiontools:sync";
export const PUSH_DELAY_MS = 2_000;
const RETRY_MS = [5_000, 15_000, 60_000];

export type SyncStatus = "off" | "synced" | "pending" | "offline" | "error";

type SyncState = {
  code: string | null;
  base: string | null; // updatedAt of the last copy both sides agreed on
  status: SyncStatus;
  error: SyncError | null;
  conflict: UserData | null;
  start(): void;
  createCode(): Promise<void>;
  connect(input: string): Promise<boolean>;
  disconnect(): void;
  deleteCloud(): Promise<void>;
  pull(): Promise<void>;
  push(): Promise<void>;
  resolveConflict(choice: "cloud" | "overwrite"): Promise<void>;
};

let pushTimer: ReturnType<typeof setTimeout> | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retries = 0;
let started = false;
// One request at a time: a push requested meanwhile is queued, a pull is skipped (the running request settles state).
let busy = false;
let pushQueued = false;

function persist(code: string | null, base: string | null) {
  try {
    if (code) localStorage.setItem(SYNC_KEY, JSON.stringify({ code, base }));
    else localStorage.removeItem(SYNC_KEY);
  } catch {
    // Storage unavailable: sync still works for this session.
  }
}

function readPersisted(): { code: string; base: string | null } | null {
  try {
    const v = JSON.parse(localStorage.getItem(SYNC_KEY) ?? "null");
    if (!v || typeof v.code !== "string" || !SYNC_CODE_RE.test(v.code)) return null;
    return { code: v.code, base: typeof v.base === "string" ? v.base : null };
  } catch {
    return null;
  }
}

function flushQueuedPush() {
  if (!pushQueued) return;
  pushQueued = false;
  void useSyncStore.getState().push();
}

function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void useSyncStore.getState().push(), PUSH_DELAY_MS);
}

export const useSyncStore = create<SyncState>()((set, get) => {
  const settle = (base: string) => {
    retries = 0;
    clearTimeout(retryTimer);
    set({ base, status: "synced", error: null });
    persist(get().code, base);
  };

  // Set base first so the user-store subscriber does not treat the incoming copy as a local edit.
  const applyRemote = (remote: UserData) => {
    settle(remote.updatedAt);
    useUserStore.getState().replaceData(remote);
  };

  const fail = (error: SyncError) => {
    set({ status: error === "network" ? "offline" : "error", error });
    if (error === "network" || error === "server" || error === "rateLimited") {
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => void get().pull(), RETRY_MS[Math.min(retries++, RETRY_MS.length - 1)]);
    }
  };

  const adopt = async (code: string) => {
    busy = true;
    const r = await fetchRemote(code).finally(() => (busy = false));
    if (get().code !== code) return;
    if (r.ok) applyRemote(r.value);
    else fail(r.error);
  };

  // Three-way compare of local and remote against base.
  const reconcile = (remote: UserData) => {
    const local = useUserStore.getState().data;
    if (remote.updatedAt === local.updatedAt) return settle(remote.updatedAt);
    const { base } = get();
    const remoteChanged = remote.updatedAt !== base;
    const localChanged = local.updatedAt !== base;
    if (remoteChanged && localChanged) return set({ conflict: remote, status: "error", error: null });
    if (remoteChanged) return applyRemote(remote);
    void get().push();
  };

  return {
    code: null,
    base: null,
    status: "off",
    error: null,
    conflict: null,

    start() {
      if (started) return;
      started = true;
      const saved = readPersisted();
      if (saved) {
        set({ code: saved.code, base: saved.base, status: "pending" });
        // Local data was unreadable and fell back to defaults: recover from the cloud, never push the blanks.
        if (useUserStore.getState().corrupted) void adopt(saved.code);
        else void get().pull();
      }
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void get().pull();
      });
      // Another tab connected, synced or disconnected: adopt its code and base.
      window.addEventListener("storage", (e) => {
        if (e.key !== SYNC_KEY) return;
        const next = readPersisted();
        if (next) set({ code: next.code, base: next.base });
        else set({ code: null, base: null, status: "off", error: null, conflict: null });
      });
    },

    async createCode() {
      const data = useUserStore.getState().data;
      set({ status: "pending", error: null });
      const r = await createRemote(data);
      if (!r.ok) return fail(r.error);
      set({ code: r.value.code });
      settle(data.updatedAt);
    },

    async connect(input) {
      const code = normalizeSyncCode(input);
      if (!SYNC_CODE_RE.test(code)) {
        set({ error: "invalidCode" });
        return false;
      }
      set({ status: "pending", error: null });
      const r = await fetchRemote(code);
      if (!r.ok) {
        set({ status: get().code ? "error" : "off", error: r.error });
        return false;
      }
      clearTimeout(pushTimer);
      set({ code, conflict: null });
      applyRemote(r.value);
      return true;
    },

    disconnect() {
      pushQueued = false;
      clearTimeout(pushTimer);
      clearTimeout(retryTimer);
      retries = 0;
      set({ code: null, base: null, status: "off", error: null, conflict: null });
      persist(null, null);
    },

    async deleteCloud() {
      const { code } = get();
      if (!code) return;
      const r = await deleteRemote(code);
      if (!r.ok) return fail(r.error);
      get().disconnect();
    },

    async pull() {
      const { code, conflict } = get();
      if (!code || conflict || busy) return;
      busy = true;
      const r = await fetchRemote(code).finally(() => (busy = false));
      if (get().code !== code) return;
      if (!r.ok) fail(r.error);
      else reconcile(r.value);
      flushQueuedPush();
    },

    async push() {
      clearTimeout(pushTimer);
      if (busy) {
        pushQueued = true;
        return;
      }
      const { code, base, conflict } = get();
      if (!code || conflict) return;
      const sent = useUserStore.getState().data;
      set({ status: "pending" });
      busy = true;
      const r = await pushRemote(code, sent, base ?? sent.updatedAt).finally(() => (busy = false));
      if (get().code !== code) return;
      if (r.ok) {
        settle(sent.updatedAt);
        if (useUserStore.getState().data.updatedAt !== sent.updatedAt) pushQueued = true;
      } else if (r.error === "conflict") reconcile(r.remote);
      else fail(r.error);
      flushQueuedPush();
    },

    async resolveConflict(choice) {
      const remote = get().conflict;
      if (!remote) return;
      set({ conflict: null });
      if (choice === "cloud") return applyRemote(remote);
      set({ base: remote.updatedAt });
      await get().push();
    },
  };
});

// Every user edit (a new updatedAt that isn't the agreed base) schedules a debounced push.
useUserStore.subscribe((state, prev) => {
  const { code, base } = useSyncStore.getState();
  if (!code || state.data.updatedAt === prev.data.updatedAt || state.data.updatedAt === base) return;
  useSyncStore.setState({ status: "pending" });
  schedulePush();
});
