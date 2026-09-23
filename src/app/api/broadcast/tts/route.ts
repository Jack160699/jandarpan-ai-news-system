import { NextRequest, NextResponse } from "next/server";
import { synthesizeShortVoice } from "@/lib/news/shorts/voice";
import type { NewsroomLanguage } from "@/lib/i18n/languages";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text")?.trim();
  const lang = (searchParams.get("lang") || "hi") as NewsroomLanguage;
  const slug = searchParams.get("slug") || `broadcast_${Date.now()}`;

  if (!text || text.length < 2) {
    return NextResponse.json({ error: "missing_text" }, { status: 400 });
  }

  // Reuse existing synthesizeShortVoice from the shorts pipeline
  const result = await synthesizeShortVoice({
    script: text.slice(0, 4096),
    language: lang,
    slug,
  });

  if (!result || result.voice.status === "unavailable") {
    // No API key — tell client to use Web Speech API fallback
    return NextResponse.json(
      { error: "voice_unavailable", hint: "Use Web Speech API fallback" },
      { status: 503 }
    );
  }

  if (result.voice.status === "failed" || !result.audio.byteLength) {
    return NextResponse.json(
      { error: result.voice.error ?? "tts_failed" },
      { status: 502 }
    );
  }

  return new NextResponse(result.audio, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(result.audio.byteLength),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
