import { json, respond, withReader } from "@/lib/user-news/http";
import { UuidSchema } from "@/lib/user-news/schemas";
import { submitForModeration } from "@/lib/user-news/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST — hand an approved story to the moderators. It does NOT publish: a moderator still has to decide. */
export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!UuidSchema.safeParse(id).success) return json({ ok: false, error: "not_found" }, 404);
  return withReader(async (user, deps) => {
    const r = await submitForModeration(deps, user.id, id);
    return r.ok ? json({ ok: true, status: r.submission.status, submittedAt: r.submission.submitted_at }) : respond(r);
  });
}
