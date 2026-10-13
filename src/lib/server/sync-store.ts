// src/lib/server/sync-store.ts
export interface SyncStore {
  get(code: string): Promise<string | null>;
  set(code: string, value: string): Promise<void>;
  del(code: string): Promise<void>;
}

/** Resolves true when the request is allowed. */
export interface RateLimiter {
  limit(key: string): Promise<boolean>;
}

export const SYNC_TTL_SECONDS = 180 * 24 * 60 * 60;

// shortcut: in-process Map without TTL — for tests, local dev and e2e only; production uses Upstash.
export function createMemoryStore(): SyncStore {
  const m = new Map<string, string>();
  return {
    async get(code) {
      return m.get(code) ?? null;
    },
    async set(code, value) {
      m.set(code, value);
    },
    async del(code) {
      m.delete(code);
    },
  };
}

export const allowAll: RateLimiter = { limit: async () => true };
