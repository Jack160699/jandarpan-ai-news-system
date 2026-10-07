import { json, respond, withReader } from "@/lib/user-news/http";
import { UuidSchema } from "@/lib/user-news/schemas";
import { generateDraft, getOwnSubmission } from "@/lib/user-news/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Up to two model calls (draft + one fact-safety repair), each bounded at 45 s.
export const maxDuration = 90;

type Ctx = { params: Promise<{ id: string }> };

/** POST — create (or re-create) the AI draft. The result is a DRAFT: nothing is submitted or published. */
export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!UuidSchema.safeParse(id).success) return json({ ok: false, error: "not_found" }, 404);
  return withReader(async (user, deps) => {
    const r = await generateDraft(deps, user.id, id);
    if (!r.ok) return respond(r);
    return respond(await getOwnSubmission(deps, user.id, id));
  });
}
