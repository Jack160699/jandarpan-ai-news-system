import { json, respond, withReader } from "@/lib/user-news/http";
import { listMyNews } from "@/lib/user-news/service";
import { createMediaReadUrls } from "@/lib/user-news/my-news-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/user-news/my — the signed-in author's own stories with real engagement. No other user's data is ever returned. */
export async function GET() {
  return withReader(async (user, deps) => {
    const result = await listMyNews(deps, user.id);
    if (!result.ok) return respond(result);
    const items = await createMediaReadUrls(deps, result.items);
    return json({ ok: true, items, monetization: result.monetization });
  });
}
