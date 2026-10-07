import { json, readJson, respond, withReader } from "@/lib/user-news/http";
import { UpdateSourceSchema, UuidSchema } from "@/lib/user-news/schemas";
import { updateSource } from "@/lib/user-news/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH — change what the author said/typed before the AI draft is (re)created. */
export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!UuidSchema.safeParse(id).success) return json({ ok: false, error: "not_found" }, 404);
  const body = await readJson(request, UpdateSourceSchema);
  if (!body.ok) return body.response;
  return withReader(async (user, deps) => {
    const r = await updateSource(deps, user.id, id, body.data);
    return r.ok ? json({ ok: true, version: r.submission.version }) : respond(r);
  });
}
