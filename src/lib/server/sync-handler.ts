// src/lib/server/sync-handler.ts
import { z } from "zod";
import { UserDataSchema } from "@/lib/user-data";
import { SYNC_CODE_RE } from "@/lib/sync-code";
import type { RateLimiter, SyncStore } from "./sync-store";

export const MAX_BODY_BYTES = 65_536;

// createLimiter is an extra, stricter limit on POST so one client cannot fill the store with new codes.
export type SyncDeps = { store: SyncStore; limiter: RateLimiter; createLimiter: RateLimiter; generateCode: () => string };

const PostBody = z.object({ data: UserDataSchema });
const PutBody = z.object({ data: UserDataSchema, baseUpdatedAt: z.iso.datetime() });

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
const fail = (status: number, error: string) => json({ error }, status);

async function readJson(req: Request): Promise<{ ok: true; value: unknown } | { ok: false; res: Response }> {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return { ok: false, res: fail(413, "too_large") };
  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return { ok: false, res: fail(413, "too_large") };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, res: fail(400, "invalid_json") };
  }
}

export async function handleSync(req: Request, deps: SyncDeps): Promise<Response> {
  try {
    return await handle(req, deps);
  } catch {
    // Store errors (e.g. Upstash) can embed the key, and so the code: never echo or log them.
    return fail(503, "unavailable");
  }
}

async function handle(req: Request, deps: SyncDeps): Promise<Response> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await deps.limiter.limit(ip))) return fail(429, "rate_limited");

  if (req.method === "POST") {
    if (!(await deps.createLimiter.limit(ip))) return fail(429, "rate_limited");
    const body = await readJson(req);
    if (!body.ok) return body.res;
    const parsed = PostBody.safeParse(body.value);
    if (!parsed.success) return fail(400, "invalid_data");
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = deps.generateCode();
      if ((await deps.store.get(code)) !== null) continue;
      await deps.store.set(code, JSON.stringify(parsed.data.data));
      return json({ code }, 201);
    }
    return fail(503, "code_exhausted");
  }

  const code = req.headers.get("x-sync-code") ?? "";
  if (!SYNC_CODE_RE.test(code)) return fail(400, "invalid_code");

  switch (req.method) {
    case "GET": {
      const raw = await deps.store.get(code);
      return raw === null ? fail(404, "not_found") : json({ data: JSON.parse(raw) });
    }
    case "PUT": {
      const body = await readJson(req);
      if (!body.ok) return body.res;
      const parsed = PutBody.safeParse(body.value);
      if (!parsed.success) return fail(400, "invalid_data");
      const raw = await deps.store.get(code);
      if (raw === null) return fail(404, "not_found");
      const stored = JSON.parse(raw) as { updatedAt: string };
      // Any change since the client's base is a conflict, even an older copy kept by another device's "keep mine".
      if (new Date(stored.updatedAt).getTime() !== new Date(parsed.data.baseUpdatedAt).getTime()) return json({ data: JSON.parse(raw) }, 409);
      await deps.store.set(code, JSON.stringify(parsed.data.data));
      return json({ updatedAt: parsed.data.data.updatedAt });
    }
    case "DELETE":
      await deps.store.del(code);
      return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
    default:
      return fail(405, "method_not_allowed");
  }
}
