import { json, respond, withReader } from "@/lib/user-news/http";
import { UuidSchema } from "@/lib/user-news/schemas";
import { approveByAuthor } from "@/lib/user-news/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST — the author explicitly approves their own final text. The platform never does this on their behalf. */
export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!UuidSchema.safeParse(id).success) return json({ ok: false, error: "not_found" }, 404);
  return withReader(async (user, deps) => {
    const r = await approveByAuthor(deps, user.id, id);
    return r.ok ? json({ ok: true, status: r.submission.status, approvedAt: r.submission.user_approved_at }) : respond(r);
  });
}
