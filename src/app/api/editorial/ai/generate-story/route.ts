import { NextResponse } from "next/server";
import { generateNewsroomStory } from "@/lib/ai/generate-story";
import type { AiDeskTemplate, AiGenerateStoryMode } from "@/lib/ai/types";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { checkEditorialAiRateLimit } from "@/lib/security/ai-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODES: AiGenerateStoryMode[] = ["prompt", "text", "link"];

export async function POST(request: Request) {
  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  const rate = await checkEditorialAiRateLimit(auth.session, "generate-story");
  if (!rate.allowed) return rate.response;

  let body: {
    mode?: AiGenerateStoryMode;
    language?: string;
    deskTemplate?: AiDeskTemplate;
    prompt?: string;
    rawText?: string;
    sourceText?: string;
    url?: string;
    existingHeadline?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.mode || !MODES.includes(body.mode)) {
    return NextResponse.json({ ok: false, error: "invalid_mode" }, { status: 400 });
  }

  const result = await generateNewsroomStory({
    mode: body.mode,
    language: body.language,
    deskTemplate: body.deskTemplate,
    prompt: body.prompt,
    rawText: body.rawText,
    sourceText: body.sourceText,
    url: body.url,
    existingHeadline: body.existingHeadline,
  });

  if (!result.ok) {
    const status =
      result.error === "ai_unavailable"
        ? 503
        : result.error === "ai_timeout"
          ? 504
          : 422;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json({ ok: true, story: result.story });
}
