import { json, readJson, respond, withReader } from "@/lib/user-news/http";
import { TranscriptSchema, UuidSchema } from "@/lib/user-news/schemas";
import { editTranscript } from "@/lib/user-news/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH — the author corrects what the speech recogniser heard. */
export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!UuidSchema.safeParse(id).success) return json({ ok: false, error: "not_found" }, 404);
  const body = await readJson(request, TranscriptSchema);
  if (!body.ok) return body.response;
  return withReader(async (user, deps) => {
    const r = await editTranscript(deps, user.id, id, body.data.transcript);
    return r.ok ? json({ ok: true, version: r.submission.version }) : respond(r);
  });
}
