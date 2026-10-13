// src/lib/server/sync-deps.ts
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { generateSyncCode } from "@/lib/sync-code";
import { allowAll, createMemoryStore, SYNC_TTL_SECONDS } from "./sync-store";
import type { SyncDeps } from "./sync-handler";

let cached: SyncDeps | null = null;

export function getSyncDeps(): SyncDeps | null {
  if (cached) return cached;
  // shortcut: SYNC_MEMORY_STORE keeps data in process memory — local dev and e2e only, never set it in production.
  if (process.env.SYNC_MEMORY_STORE === "1") {
    return (cached = { store: createMemoryStore(), limiter: allowAll, generateCode: generateSyncCode });
  }
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const redis = new Redis({ url, token, automaticDeserialization: false });
  const ratelimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "1 m"), prefix: "aiontools:rl" });
  const key = (code: string) => `sync:${code}`;
  return (cached = {
    store: {
      get: (code) => redis.get<string>(key(code)),
      set: async (code, value) => {
        await redis.set(key(code), value, { ex: SYNC_TTL_SECONDS });
      },
      del: async (code) => {
        await redis.del(key(code));
      },
    },
    limiter: { limit: async (ip) => (await ratelimit.limit(ip)).success },
    generateCode: generateSyncCode,
  });
}
