import { json, readJson, respond, withReader } from "@/lib/user-news/http";
import { TranscribeSchema, UuidSchema } from "@/lib/user-news/schemas";
import { transcribeVoice } from "@/lib/user-news/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** POST — turn an uploaded voice note into text. The author can correct the transcript before the AI uses it. */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!UuidSchema.safeParse(id).success) return json({ ok: false, error: "not_found" }, 404);
  const body = await readJson(request, TranscribeSchema);
  if (!body.ok) return body.response;
  return withReader(async (user, deps) => {
    const r = await transcribeVoice(deps, user.id, id, body.data.mediaId);
    return r.ok ? json({ ok: true, transcript: r.transcript }) : respond(r);
  });
}
