import { NextResponse } from "next/server";
import { runEditorAiAction } from "@/lib/editorial-editor/ai";
import type { EditorAiAction } from "@/lib/editorial-editor/types";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS: EditorAiAction[] = [
  "rewrite",
  "headlines",
  "seo",
  "grammar",
  "summarize",
  "translate",
  "tone",
  "tags",
];

export async function POST(request: Request) {
  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  let body: {
    action?: EditorAiAction;
    headline?: string;
    summary?: string;
    body?: string;
    language?: string;
    tone?: string;
    targetLang?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.action || !ACTIONS.includes(body.action)) {
    return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
  }

  const result = await runEditorAiAction({
    action: body.action,
    headline: body.headline ?? "",
    summary: body.summary ?? "",
    body: body.body ?? "",
    language: body.language ?? "hi",
    tone: body.tone,
    targetLang: body.targetLang,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
