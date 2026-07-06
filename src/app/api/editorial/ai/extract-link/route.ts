import { NextResponse } from "next/server";
import { extractLinkContent } from "@/lib/ai/extract-link";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { checkEditorialAiRateLimit } from "@/lib/security/ai-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  const rate = await checkEditorialAiRateLimit(auth.session, "extract-link");
  if (!rate.allowed) return rate.response;

  let body: { url?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ ok: false, error: "missing_url" }, { status: 400 });
  }

  const result = await extractLinkContent(url);
  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json(result);
}
