import { json, respond, withReader } from "@/lib/user-news/http";
import { UuidSchema } from "@/lib/user-news/schemas";
import { withdraw } from "@/lib/user-news/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST — withdraw the author's own story at any point, including after publication (it is taken out of every feed). */
export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!UuidSchema.safeParse(id).success) return json({ ok: false, error: "not_found" }, 404);
  return withReader(async (user, deps) => {
    const r = await withdraw(deps, user.id, id);
    return r.ok ? json({ ok: true, status: r.submission.status }) : respond(r);
  });
}
