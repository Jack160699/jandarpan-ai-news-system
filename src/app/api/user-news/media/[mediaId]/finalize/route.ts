import { json, respond, withReader } from "@/lib/user-news/http";
import { UuidSchema } from "@/lib/user-news/schemas";
import { finalizeMedia } from "@/lib/user-news/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ mediaId: string }> };

/**
 * POST — after the browser has uploaded the file, validate it from the stored BYTES (type by magic number, size from storage, landscape,
 * duration), re-encode images, strip EXIF/GPS and make a thumbnail. Client-side checks are never trusted.
 */
export async function POST(_request: Request, ctx: Ctx) {
  const { mediaId } = await ctx.params;
  if (!UuidSchema.safeParse(mediaId).success) return json({ ok: false, error: "not_found" }, 404);
  return withReader(async (user, deps) => {
    const r = await finalizeMedia(deps, user.id, mediaId);
    return r.ok ? json({ ok: true, media: { id: r.media.id, kind: r.media.kind, status: r.media.processing_status, width: r.media.width, height: r.media.height, durationMs: r.media.duration_ms, needsProbe: Boolean((r.media.validation as { needsProbe?: boolean })?.needsProbe) } }) : respond(r);
  });
}
