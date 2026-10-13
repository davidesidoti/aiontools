// src/lib/sync-client.test.ts
// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRemote, fetchRemote, pushRemote, deleteRemote } from "./sync-client";
import { handleSync } from "./server/sync-handler";
import { createMemoryStore, allowAll } from "./server/sync-store";
import { createDefaultUserData } from "./user-data";

const CODE = "wolf-amber-river-0001";
const data = createDefaultUserData(new Date("2026-10-14T10:00:00.000Z"));
let limited: boolean;

beforeEach(() => {
  limited = false;
  const deps = { store: createMemoryStore(), limiter: { limit: async () => !limited }, createLimiter: allowAll, generateCode: () => CODE };
  vi.stubGlobal("fetch", (input: string, init?: RequestInit) => handleSync(new Request(new URL(input, "http://localhost"), init), deps));
});
afterEach(() => vi.unstubAllGlobals());

describe("sync client", () => {
  it("create then fetch round-trips the data", async () => {
    expect(await createRemote(data)).toEqual({ ok: true, value: { code: CODE } });
    expect(await fetchRemote(CODE)).toEqual({ ok: true, value: data });
  });

  it("a push with a stale base comes back as a conflict carrying the remote copy", async () => {
    await createRemote(data);
    const newer = { ...data, updatedAt: "2026-10-14T11:00:00.000Z" };
    expect(await pushRemote(CODE, newer, data.updatedAt)).toEqual({ ok: true, value: { updatedAt: newer.updatedAt } });
    const stale = { ...data, updatedAt: "2026-10-14T10:30:00.000Z" };
    expect(await pushRemote(CODE, stale, data.updatedAt)).toEqual({ ok: false, error: "conflict", remote: newer });
  });

  it("maps HTTP errors", async () => {
    expect(await fetchRemote("wolf-amber-river-0002")).toEqual({ ok: false, error: "notFound" });
    expect(await fetchRemote("nope")).toEqual({ ok: false, error: "invalidCode" });
    limited = true;
    expect(await fetchRemote(CODE)).toEqual({ ok: false, error: "rateLimited" });
  });

  it("maps a network failure and an unconfigured server", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
    expect(await fetchRemote(CODE)).toEqual({ ok: false, error: "network" });
    vi.stubGlobal("fetch", async () => Response.json({ error: "not_configured" }, { status: 503 }));
    expect(await createRemote(data)).toEqual({ ok: false, error: "server" });
  });

  it("delete removes the cloud copy", async () => {
    await createRemote(data);
    expect(await deleteRemote(CODE)).toEqual({ ok: true, value: null });
    expect(await fetchRemote(CODE)).toEqual({ ok: false, error: "notFound" });
  });
});
