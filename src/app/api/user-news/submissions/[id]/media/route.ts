import { json, readJson, respond, withReader } from "@/lib/user-news/http";
import { MediaSlotSchema, UuidSchema } from "@/lib/user-news/schemas";
import { createMediaSlot } from "@/lib/user-news/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST — reserve a media slot and get a one-time signed upload URL. The browser uploads the file DIRECTLY to private storage (large
 * files never pass through a server function); the server then validates the stored BYTES in /api/user-news/media/[mediaId]/finalize.
 */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!UuidSchema.safeParse(id).success) return json({ ok: false, error: "not_found" }, 404);
  const body = await readJson(request, MediaSlotSchema);
  if (!body.ok) return body.response;
  return withReader(async (user, deps) => respond(await createMediaSlot(deps, user.id, id, body.data)));
}
