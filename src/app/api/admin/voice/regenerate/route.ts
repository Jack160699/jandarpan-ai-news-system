import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminPermission } from "@/lib/auth/admin-authorization";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { createAdminServerClient } from "@/lib/supabase";
import { regenerateArticleAudio, type AudioQueueRow, type AudioRegenerateRepo } from "@/lib/voice/regenerate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ articleId: z.string().uuid(), language: z.enum(["hi-IN", "en-IN"]).optional(), kind: z.enum(["radio", "tv", "short_bulletin"]).optional() }).strict();

function productionRepo(): AudioRegenerateRepo {
  const db = createAdminServerClient();
  return {
    async listForArticle(articleId) {
      const { data, error } = await db.from("article_audio" as never).select("id,article_id,language,script_kind,status").eq("article_id", articleId);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as AudioQueueRow[];
    },
    async requeue(ids) {
      const { data, error } = await db
        .from("article_audio" as never)
        .update({ status: "pending", attempts: 0, next_attempt_at: null, error: null, updated_at: new Date().toISOString() } as never)
        .in("id", ids)
        .in("status", ["failed", "invalid"])
        .select("id");
      if (error) throw new Error(error.message);
      return (data ?? []).length;
    },
    async audit(event) {
      const { error } = await db.from("platform_audit_events" as never).insert(event as never);
      if (error) throw new Error(error.message);
    },
  };
}

/** POST — put a story's failed/invalid audio back in the worker queue. Never calls a TTS provider and never re-bills valid audio. */
export async function POST(request: Request) {
  const auth = await requireAdminPermission(request, "publish:write");
  if (!auth.ok) return auth.response;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400, headers: noStoreHeaders() });
  try {
    const r = await regenerateArticleAudio(productionRepo(), auth.session.userId, parsed.data.articleId, { language: parsed.data.language, kind: parsed.data.kind });
    if (!r.ok) return NextResponse.json({ ok: false, error: r.code, message: r.message }, { status: 404, headers: noStoreHeaders() });
    return NextResponse.json(r, { headers: noStoreHeaders() });
  } catch {
    return NextResponse.json({ ok: false, error: "regenerate_failed" }, { status: 503, headers: noStoreHeaders() });
  }
}
