// src/lib/server/sync-deps.test.ts
// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

const load = async () => (await import("./sync-deps")).getSyncDeps;

describe("getSyncDeps", () => {
  it("returns null when no store is configured", async () => {
    for (const k of ["SYNC_MEMORY_STORE", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"]) vi.stubEnv(k, "");
    expect((await load())()).toBeNull();
  });
  it("uses the memory store when SYNC_MEMORY_STORE=1", async () => {
    vi.stubEnv("SYNC_MEMORY_STORE", "1");
    const deps = (await load())();
    expect(deps).not.toBeNull();
    await deps!.store.set("wolf-amber-river-0001", "x");
    expect(await deps!.store.get("wolf-amber-river-0001")).toBe("x");
  });
});
