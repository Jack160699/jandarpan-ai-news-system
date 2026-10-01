/**
 * GET /api/audio/{articleId}?lang=hi|en&kind=radio|tv|short_bulletin[&format=json]
 *
 * Public playback of generated news audio. Objects live in a PRIVATE bucket; this route confirms the
 * article is public and the audio is ready, then redirects to a short-lived signed URL (or returns it
 * as JSON). Only ready, validated audio is ever served, so a failed generation is a 404 — never a
 * broken player.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { checkPublicApiRateLimit } from "@/lib/security/public-rate-limit";
import { getSignedPlaybackUrl } from "@/lib/voice/generate-article-audio";
import { PUBLIC_EDITORIAL_STATUSES } from "@/lib/newsroom/publish-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = new Set(["radio", "tv", "short_bulletin"]);

export async function GET(request: NextRequest, context: { params: Promise<{ articleId: string }> }) {
  const rate = await checkPublicApiRateLimit(request, "audio-playback", 240, 3600);
  if (!rate.allowed) return rate.response;

  const { articleId } = await context.params;
  if (!UUID.test(articleId) || !isSupabaseConfigured()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const sp = request.nextUrl.searchParams;
  const lang = sp.get("lang") === "en" ? "en-IN" : "hi-IN";
  const kindParam = sp.get("kind") ?? "radio";
  const kind = KINDS.has(kindParam) ? kindParam : "radio";

  const supabase = createAdminServerClient();
  const { data: article } = await supabase
    .from("generated_articles")
    .select("id,published_at,editorial_status")
    .eq("id", articleId)
    .maybeSingle();
  const isPublic =
    article?.published_at != null &&
    (PUBLIC_EDITORIAL_STATUSES as readonly string[]).includes(String(article.editorial_status ?? "approved"));
  if (!isPublic) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: audio } = await supabase
    .from("article_audio" as never)
    .select("storage_path,duration_ms,style,provider")
    .eq("article_id", articleId)
    .eq("language", lang)
    .eq("script_kind", kind)
    .eq("status", "ready")
    .not("storage_path", "is", null)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = audio as { storage_path: string; duration_ms: number | null } | null;
  if (!row) return NextResponse.json({ error: "audio_not_ready" }, { status: 404 });

  const url = await getSignedPlaybackUrl(row.storage_path);
  if (!url) return NextResponse.json({ error: "audio_unavailable" }, { status: 503 });

  const cache = { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" };
  if (sp.get("format") === "json") {
    return NextResponse.json({ url, durationMs: row.duration_ms, expiresInSec: 3600 }, { headers: cache });
  }
  return NextResponse.redirect(url, { status: 302, headers: cache });
}
