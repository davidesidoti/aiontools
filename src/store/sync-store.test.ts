// src/store/sync-store.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useSyncStore } from "./sync-store";
import { useUserStore } from "./user-store";
import { createDefaultUserData, type UserData } from "@/lib/user-data";
import { addCharacter } from "@/lib/characters";
import { handleSync } from "@/lib/server/sync-handler";
import { createMemoryStore, allowAll, type SyncStore } from "@/lib/server/sync-store";
import { generateSyncCode } from "@/lib/sync-code";

const t0 = new Date("2026-10-14T10:00:00.000Z");
let server: SyncStore;

const routeFetch = () =>
  vi.stubGlobal("fetch", (input: string, init?: RequestInit) =>
    handleSync(new Request(new URL(input, "http://localhost"), init), { store: server, limiter: allowAll, generateCode: generateSyncCode }),
  );

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(t0);
  localStorage.clear();
  server = createMemoryStore();
  routeFetch();
  useUserStore.setState({ data: createDefaultUserData(t0), hydrated: true, corrupted: false, persistPaused: false });
  useSyncStore.getState().disconnect();
});

afterEach(() => {
  useSyncStore.getState().disconnect();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const s = () => useSyncStore.getState();
const local = () => useUserStore.getState().data;
const remote = async (code: string) => JSON.parse((await server.get(code))!) as UserData;
const edit = (fn: (d: UserData) => UserData, at: string) => {
  vi.setSystemTime(new Date(at));
  useUserStore.getState().update(fn);
};
const addAria = (d: UserData) => addCharacter(d, { name: "Aria", classId: "chanter" }, "a");
const addKael = (d: UserData) => addCharacter(d, { name: "Kael", classId: "cleric" }, "k");

describe("sync engine", () => {
  it("createCode uploads local data and reports synced", async () => {
    edit(addAria, "2026-10-14T10:01:00.000Z");
    await s().createCode();
    expect(s().status).toBe("synced");
    expect(s().code).toMatch(/^[a-z]+-[a-z]+-[a-z]+-\d{4}$/);
    expect((await remote(s().code!)).characters[0].name).toBe("Aria");
    expect(JSON.parse(localStorage.getItem("aiontools:sync")!).code).toBe(s().code);
  });

  it("connect on another device adopts the cloud copy (code typed loosely)", async () => {
    edit(addAria, "2026-10-14T10:01:00.000Z");
    await s().createCode();
    const code = s().code!;
    s().disconnect();
    useUserStore.setState({ data: createDefaultUserData(t0) });
    expect(await s().connect(`  ${code.toUpperCase()} `)).toBe(true);
    expect(local().characters[0].name).toBe("Aria");
    expect(s()).toMatchObject({ code, status: "synced", error: null });
  });

  it("connect rejects a malformed code without calling the server", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    expect(await s().connect("hello")).toBe(false);
    expect(s().error).toBe("invalidCode");
    expect(spy).not.toHaveBeenCalled();
  });

  it("pushes a local edit after the debounce", async () => {
    await s().createCode();
    const code = s().code!;
    edit(addAria, "2026-10-14T10:05:00.000Z");
    expect(s().status).toBe("pending");
    await vi.advanceTimersByTimeAsync(1_000);
    expect((await remote(code)).characters).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1_500);
    expect((await remote(code)).characters).toHaveLength(1);
    expect(s().status).toBe("synced");
  });

  it("pull adopts a newer remote copy when nothing changed locally", async () => {
    await s().createCode();
    const code = s().code!;
    await server.set(code, JSON.stringify({ ...addKael(await remote(code)), updatedAt: "2026-10-14T10:03:00.000Z" }));
    await s().pull();
    expect(local().characters[0].name).toBe("Kael");
    expect(s().base).toBe("2026-10-14T10:03:00.000Z");
  });

  async function makeConflict() {
    await s().createCode();
    const code = s().code!;
    await server.set(code, JSON.stringify({ ...addKael(await remote(code)), updatedAt: "2026-10-14T10:03:00.000Z" }));
    edit(addAria, "2026-10-14T10:04:00.000Z");
    await vi.advanceTimersByTimeAsync(2_500);
    return code;
  }

  it("concurrent edits on two devices raise a conflict instead of overwriting", async () => {
    const code = await makeConflict();
    expect(s().conflict?.characters[0].name).toBe("Kael");
    expect((await remote(code)).characters[0].name).toBe("Kael");
    expect(local().characters[0].name).toBe("Aria");
  });

  it("resolving a conflict with 'cloud' adopts the remote copy", async () => {
    await makeConflict();
    await s().resolveConflict("cloud");
    expect(s().conflict).toBeNull();
    expect(local().characters[0].name).toBe("Kael");
    expect(s().status).toBe("synced");
  });

  it("resolving a conflict with 'overwrite' pushes this device's copy", async () => {
    const code = await makeConflict();
    await s().resolveConflict("overwrite");
    expect(s().conflict).toBeNull();
    expect((await remote(code)).characters[0].name).toBe("Aria");
    expect(s().status).toBe("synced");
  });

  it("a remote copy identical to local settles without a conflict", async () => {
    await s().createCode();
    const code = s().code!;
    edit(addAria, "2026-10-14T10:04:00.000Z");
    await server.set(code, JSON.stringify(local())); // another tab already pushed the same data
    await vi.advanceTimersByTimeAsync(2_500);
    expect(s().conflict).toBeNull();
    expect(s().status).toBe("synced");
  });

  it("network failure marks offline and keeps local data", async () => {
    await s().createCode();
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
    edit(addAria, "2026-10-14T10:05:00.000Z");
    await vi.advanceTimersByTimeAsync(2_500);
    expect(s()).toMatchObject({ status: "offline", error: "network" });
    expect(local().characters).toHaveLength(1);
  });

  it("cloud data gone (404) reports notFound and keeps local data", async () => {
    await s().createCode();
    await server.del(s().code!);
    edit(addAria, "2026-10-14T10:05:00.000Z");
    await vi.advanceTimersByTimeAsync(2_500);
    expect(s()).toMatchObject({ status: "error", error: "notFound" });
    expect(local().characters).toHaveLength(1);
  });

  it("deleteCloud removes the remote copy and disconnects", async () => {
    await s().createCode();
    const code = s().code!;
    await s().deleteCloud();
    expect(await server.get(code)).toBeNull();
    expect(s()).toMatchObject({ code: null, status: "off" });
    expect(localStorage.getItem("aiontools:sync")).toBeNull();
  });
});
