// src/app/api/sync/route.ts
import { handleSync } from "@/lib/server/sync-handler";
import { getSyncDeps } from "@/lib/server/sync-deps";

async function handler(req: Request): Promise<Response> {
  const deps = getSyncDeps();
  if (!deps) return Response.json({ error: "not_configured" }, { status: 503, headers: { "cache-control": "no-store" } });
  return handleSync(req, deps);
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
