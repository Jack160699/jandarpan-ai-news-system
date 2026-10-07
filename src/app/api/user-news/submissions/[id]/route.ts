import { json, readJson, respond, withReader } from "@/lib/user-news/http";
import { EditSchema, UuidSchema } from "@/lib/user-news/schemas";
import { getOwnSubmission, saveEdit } from "@/lib/user-news/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const notFound = () => json({ ok: false, error: "not_found", message: "That story was not found." }, 404);

/** GET — the author's own story (editor view). A stranger's id is indistinguishable from a missing one. */
export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!UuidSchema.safeParse(id).success) return notFound();
  return withReader(async (user, deps) => respond(await getOwnSubmission(deps, user.id, id)));
}

/** PATCH — the author edits the AI draft. Facts the AI added that are not in what the author said stay flagged until removed. */
export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!UuidSchema.safeParse(id).success) return notFound();
  const body = await readJson(request, EditSchema);
  if (!body.ok) return body.response;
  return withReader(async (user, deps) => respond(await saveEdit(deps, user.id, id, body.data)));
}
