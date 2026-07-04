import { NextRequest, NextResponse } from "next/server";
import { bundleFromRow } from "@/lib/news/shorts/build-short";
import { synthesizeShortVoice } from "@/lib/news/shorts/voice";
import { getGeneratedArticleBySlug } from "@/lib/newsroom/generated/read";
import { createAdminServerClient } from "@/lib/supabase";
import { checkPublicApiRateLimit } from "@/lib/security/public-rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const rate = await checkPublicApiRateLimit(request, "shorts-voice", 15, 3600);
  if (!rate.allowed) return rate.response;

  const { slug } = await context.params;
  const row = await getGeneratedArticleBySlug(slug);
  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let bundle = bundleFromRow(row);
  if (!bundle?.script) {
    return NextResponse.json({ error: "short not ready" }, { status: 404 });
  }

  const result = await synthesizeShortVoice({
    script: bundle.script,
    language: bundle.language,
    slug,
  });

  if (!result || result.voice.status === "unavailable") {
    return NextResponse.json(
      { error: "voice_unavailable", hint: "Set OPENAI_API_KEY" },
      { status: 503 }
    );
  }

  if (result.voice.status === "failed" || !result.audio.byteLength) {
    return NextResponse.json(
      { error: result.voice.error ?? "tts_failed" },
      { status: 502 }
    );
  }

  bundle = { ...bundle, voice: result.voice };
  const supabase = createAdminServerClient();
  let updateQuery = supabase
    .from("generated_articles")
    .update({
      shorts_metadata: bundle,
      editorial_metadata: { ...row.editorial_metadata, shorts: bundle },
    })
    .eq("id", row.id);
  if (row.tenant_id) {
    updateQuery = updateQuery.eq("tenant_id", row.tenant_id);
  }
  await updateQuery;

  return new NextResponse(result.audio, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
