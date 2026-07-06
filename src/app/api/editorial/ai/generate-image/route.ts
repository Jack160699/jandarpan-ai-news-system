import { NextResponse } from "next/server";
import { generateStoryCoverImage } from "@/lib/ai/generate-image";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { checkEditorialAiRateLimit } from "@/lib/security/ai-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  const rate = await checkEditorialAiRateLimit(auth.session, "generate-image");
  if (!rate.allowed) return rate.response;

  let body: { headline?: string; summary?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const result = await generateStoryCoverImage({
    headline: body.headline ?? "",
    summary: body.summary ?? "",
  });

  if (!result.ok) {
    const status = result.error === "ai_unavailable" ? 503 : 422;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json({ ok: true, imageUrl: result.imageUrl });
}
