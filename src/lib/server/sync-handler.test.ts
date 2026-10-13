// src/lib/server/sync-handler.test.ts
// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { handleSync, type SyncDeps } from "./sync-handler";
import { createMemoryStore, allowAll } from "./sync-store";
import { createDefaultUserData } from "@/lib/user-data";

const CODE = "wolf-amber-river-0001";
const data = createDefaultUserData(new Date("2026-10-14T10:00:00.000Z"));
let deps: SyncDeps;
let codes: string[];

beforeEach(() => {
  codes = [CODE, "wolf-amber-river-0002"];
  deps = { store: createMemoryStore(), limiter: allowAll, createLimiter: allowAll, generateCode: () => codes.shift()! };
});

const req = (method: string, opts: { code?: string; body?: unknown; raw?: string } = {}) =>
  new Request("http://localhost/api/sync", {
    method,
    headers: { "content-type": "application/json", ...(opts.code && { "x-sync-code": opts.code }) },
    body: opts.raw ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
  });

describe("handleSync", () => {
  it("POST creates a code, GET returns the data", async () => {
    const created = await handleSync(req("POST", { body: { data } }), deps);
    expect(created.status).toBe(201);
    expect(created.headers.get("cache-control")).toBe("no-store");
    expect(await created.json()).toEqual({ code: CODE });
    const got = await handleSync(req("GET", { code: CODE }), deps);
    expect(got.status).toBe(200);
    expect(await got.json()).toEqual({ data });
  });

  it("POST skips a code that is already taken", async () => {
    await deps.store.set(CODE, JSON.stringify(data));
    const created = await handleSync(req("POST", { body: { data } }), deps);
    expect(await created.json()).toEqual({ code: "wolf-amber-river-0002" });
  });

  it("rejects a missing or malformed code", async () => {
    expect((await handleSync(req("GET"), deps)).status).toBe(400);
    const res = await handleSync(req("GET", { code: "nope" }), deps);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_code" });
  });

  it("GET of an unknown code is 404", async () => {
    expect((await handleSync(req("GET", { code: CODE }), deps)).status).toBe(404);
  });

  it("PUT with the current base saves; with a stale base returns 409 and the stored copy", async () => {
    await handleSync(req("POST", { body: { data } }), deps);
    const v2 = { ...data, updatedAt: "2026-10-14T11:00:00.000Z" };
    const ok = await handleSync(req("PUT", { code: CODE, body: { data: v2, baseUpdatedAt: data.updatedAt } }), deps);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ updatedAt: v2.updatedAt });
    const v3 = { ...data, updatedAt: "2026-10-14T12:00:00.000Z" };
    const stale = await handleSync(req("PUT", { code: CODE, body: { data: v3, baseUpdatedAt: data.updatedAt } }), deps);
    expect(stale.status).toBe(409);
    expect(await stale.json()).toEqual({ data: v2 });
  });

  it("PUT to an unknown code is 404 (codes are only created by POST)", async () => {
    const res = await handleSync(req("PUT", { code: CODE, body: { data, baseUpdatedAt: data.updatedAt } }), deps);
    expect(res.status).toBe(404);
  });

  it("rejects oversized, malformed and invalid bodies", async () => {
    const big = await handleSync(req("POST", { raw: JSON.stringify({ data, pad: "x".repeat(70_000) }) }), deps);
    expect(big.status).toBe(413);
    const badJson = await handleSync(req("POST", { raw: "{nope" }), deps);
    expect(await badJson.json()).toEqual({ error: "invalid_json" });
    const badData = await handleSync(req("POST", { body: { data: { hello: "world" } } }), deps);
    expect(badData.status).toBe(400);
    expect(await badData.json()).toEqual({ error: "invalid_data" });
  });

  it("rate limits per IP", async () => {
    deps.limiter = { limit: async () => false };
    const res = await handleSync(req("GET", { code: CODE }), deps);
    expect(res.status).toBe(429);
  });

  it("DELETE removes the data", async () => {
    await handleSync(req("POST", { body: { data } }), deps);
    expect((await handleSync(req("DELETE", { code: CODE }), deps)).status).toBe(204);
    expect((await handleSync(req("GET", { code: CODE }), deps)).status).toBe(404);
  });

  it("other methods are 405", async () => {
    expect((await handleSync(req("PATCH", { code: CODE }), deps)).status).toBe(405);
  });

  it("a PUT whose base differs from the stored copy is a conflict even if the stored copy is older", async () => {
    await handleSync(req("POST", { body: { data } }), deps);
    const v2 = { ...data, updatedAt: "2026-10-14T11:00:00.000Z" };
    await handleSync(req("PUT", { code: CODE, body: { data: v2, baseUpdatedAt: data.updatedAt } }), deps);
    // Another device resolves a conflict with "keep this device": its copy is older than v2.
    const kept = { ...data, updatedAt: "2026-10-14T10:30:00.000Z" };
    expect((await handleSync(req("PUT", { code: CODE, body: { data: kept, baseUpdatedAt: v2.updatedAt } }), deps)).status).toBe(200);
    // A device still on base v2 must not silently overwrite the kept copy.
    const stale = { ...data, updatedAt: "2026-10-14T12:00:00.000Z" };
    const res = await handleSync(req("PUT", { code: CODE, body: { data: stale, baseUpdatedAt: v2.updatedAt } }), deps);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ data: kept });
  });

  it("a storage failure answers 503 without echoing or logging the error", async () => {
    const log = vi.spyOn(console, "error");
    deps.store = { ...deps.store, get: async () => { throw new Error(`command was: ["get","sync:${CODE}"]`); } };
    const res = await handleSync(req("GET", { code: CODE }), deps);
    expect(res.status).toBe(503);
    const body = await res.text();
    expect(body).toBe(JSON.stringify({ error: "unavailable" }));
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("creating codes has its own, stricter limit", async () => {
    deps.createLimiter = { limit: async () => false };
    expect((await handleSync(req("POST", { body: { data } }), deps)).status).toBe(429);
    expect((await handleSync(req("GET", { code: CODE }), deps)).status).toBe(404);
  });
});
