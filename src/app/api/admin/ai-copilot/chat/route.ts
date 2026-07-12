/**
 * POST /api/admin/ai-copilot/chat — natural language copilot queries
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { handleCopilotChat } from "@/lib/ai-copilot/chat-handler";
import { isAiCopilotEnabled } from "@/lib/ai-copilot/config";
import { recordAction, saveConversation } from "@/lib/ai-copilot/repository";
import { logCopilot } from "@/lib/ai-copilot/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireEditorialAuth(request, "analytics:read");
  if (!auth.ok) return auth.response;

  if (!isAiCopilotEnabled()) {
    return NextResponse.json(
      { ok: false, error: "copilot_disabled" },
      { status: 403 }
    );
  }

  let body: { message?: string };
  try {
    body = (await request.json()) as { message?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ ok: false, error: "message_required" }, { status: 400 });
  }

  await saveConversation({
    userId: auth.session.userId,
    userEmail: auth.session.email,
    role: "user",
    message,
  });

  const response = await handleCopilotChat(message);

  await saveConversation({
    userId: auth.session.userId,
    userEmail: auth.session.email,
    role: "assistant",
    message: response.answer,
    intent: response.intent,
    responsePayload: response as unknown as Record<string, unknown>,
  });

  await recordAction({
    actionType: "chat_query",
    userId: auth.session.userId,
    userEmail: auth.session.email,
    metadata: { intent: response.intent, message },
  });

  logCopilot("chat_query", { intent: response.intent, userId: auth.session.userId });

  return NextResponse.json({
    ok: true,
    response,
    timestamp: new Date().toISOString(),
  });
}
