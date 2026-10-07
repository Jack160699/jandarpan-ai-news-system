import { createProductionDeps } from "@/lib/user-news/supabase-adapters";
import { getSessionUser, json } from "@/lib/user-news/http";
import { getPostNewsStatus } from "@/lib/user-news/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/user-news/status — can this reader post news, why not, and what is available (voice, limits). Safe for anonymous callers. */
export async function GET() {
  const user = await getSessionUser();
  try {
    const status = await getPostNewsStatus(await createProductionDeps(), user?.id ?? null);
    return json({ ok: true, status });
  } catch {
    return json({ ok: false, error: "server_error" }, 500);
  }
}
