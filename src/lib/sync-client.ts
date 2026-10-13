// src/lib/sync-client.ts
import { UserDataSchema, type UserData } from "./user-data";

export type SyncError = "invalidCode" | "notFound" | "rateLimited" | "network" | "server";
export type SyncResult<T> = { ok: true; value: T } | { ok: false; error: SyncError };
export type PushResult = SyncResult<{ updatedAt: string }> | { ok: false; error: "conflict"; remote: UserData };

const ENDPOINT = "/api/sync";
type Raw = { status: number; json: unknown } | null;

async function call(method: string, code?: string, body?: unknown): Promise<Raw> {
  try {
    const res = await fetch(ENDPOINT, {
      method,
      cache: "no-store",
      headers: { "content-type": "application/json", ...(code && { "x-sync-code": code }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = res.status === 204 ? null : await res.json().catch(() => null);
    return { status: res.status, json };
  } catch {
    return null;
  }
}

function toError(r: Raw): SyncError {
  if (!r) return "network";
  if (r.status === 429) return "rateLimited";
  if (r.status === 404) return "notFound";
  if (r.status === 400 && (r.json as { error?: string } | null)?.error === "invalid_code") return "invalidCode";
  return "server";
}

function parseData(json: unknown): UserData | null {
  const r = UserDataSchema.safeParse((json as { data?: unknown } | null)?.data);
  return r.success ? r.data : null;
}

export async function createRemote(data: UserData): Promise<SyncResult<{ code: string }>> {
  const r = await call("POST", undefined, { data });
  const code = (r?.json as { code?: unknown } | null)?.code;
  return r?.status === 201 && typeof code === "string" ? { ok: true, value: { code } } : { ok: false, error: toError(r) };
}

export async function fetchRemote(code: string): Promise<SyncResult<UserData>> {
  const r = await call("GET", code);
  if (!r || r.status !== 200) return { ok: false, error: toError(r) };
  const data = parseData(r.json);
  return data ? { ok: true, value: data } : { ok: false, error: "server" };
}

export async function pushRemote(code: string, data: UserData, baseUpdatedAt: string): Promise<PushResult> {
  const r = await call("PUT", code, { data, baseUpdatedAt });
  if (r?.status === 200) return { ok: true, value: { updatedAt: data.updatedAt } };
  if (r?.status === 409) {
    const remote = parseData(r.json);
    if (remote) return { ok: false, error: "conflict", remote };
  }
  return { ok: false, error: toError(r) };
}

export async function deleteRemote(code: string): Promise<SyncResult<null>> {
  const r = await call("DELETE", code);
  return r?.status === 204 ? { ok: true, value: null } : { ok: false, error: toError(r) };
}
