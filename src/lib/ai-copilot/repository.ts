/**
 * AI Copilot — Supabase persistence
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { COPILOT_MAX_RECOMMENDATIONS } from "@/lib/ai-copilot/config";
import { rankDrafts, rankRecommendations } from "@/lib/ai-copilot/priority-queue";
import type {
  ActionType,
  GeneratedReport,
  RecommendationDraft,
  UnifiedRecommendation,
} from "@/lib/ai-copilot/types";

type CopilotTable =
  | "ai_recommendations"
  | "ai_actions"
  | "ai_reports"
  | "ai_conversations";

function fromCopilot(table: CopilotTable) {
  return createAdminServerClient().from(table as never);
}

function mapRecommendation(row: Record<string, unknown>): UnifiedRecommendation {
  return {
    id: String(row.id),
    external_key: String(row.external_key),
    source: row.source as UnifiedRecommendation["source"],
    priority: row.priority as UnifiedRecommendation["priority"],
    confidence: Number(row.confidence),
    article_id: (row.article_id as string | null) ?? null,
    article_slug: (row.article_slug as string | null) ?? null,
    district: (row.district as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    title: String(row.title),
    reason: String(row.reason),
    recommended_action: String(row.recommended_action),
    status: row.status as UnifiedRecommendation["status"],
    priority_score: Number(row.priority_score),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: String(row.created_at),
  };
}

export async function syncRecommendations(
  drafts: RecommendationDraft[]
): Promise<number> {
  if (!isSupabaseConfigured() || drafts.length === 0) return 0;
  let synced = 0;

  for (const draft of rankDrafts(drafts).slice(0, COPILOT_MAX_RECOMMENDATIONS)) {
    const { error } = await fromCopilot("ai_recommendations").upsert(
      {
        external_key: draft.external_key,
        source: draft.source,
        priority: draft.priority,
        confidence: draft.confidence,
        article_id: draft.article_id ?? null,
        article_slug: draft.article_slug ?? null,
        district: draft.district ?? null,
        category: draft.category ?? null,
        title: draft.title,
        reason: draft.reason,
        recommended_action: draft.recommended_action,
        priority_score: draft.priority_score,
        metadata: draft.metadata ?? {},
        status: "open",
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "external_key" }
    );
    if (!error) synced += 1;
  }

  return synced;
}

export async function listRecommendations(
  limit = 30,
  status = "open"
): Promise<UnifiedRecommendation[]> {
  if (!isSupabaseConfigured()) return [];

  const { data } = await fromCopilot("ai_recommendations")
    .select("*")
    .eq("status", status)
    .order("priority_score", { ascending: false })
    .limit(limit);

  return rankRecommendations(
    (data ?? []).map((row) => mapRecommendation(row as Record<string, unknown>))
  );
}

export async function recordAction(input: {
  recommendationId?: string;
  articleId?: string;
  actionType: ActionType;
  userId?: string;
  userEmail?: string;
  outcome?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await fromCopilot("ai_actions").insert({
    recommendation_id: input.recommendationId ?? null,
    article_id: input.articleId ?? null,
    action_type: input.actionType,
    user_id: input.userId ?? null,
    user_email: input.userEmail ?? null,
    outcome: input.outcome ?? null,
    metadata: input.metadata ?? {},
  } as never);

  if (
    input.recommendationId &&
    ["viewed", "approved", "applied", "rejected"].includes(input.actionType)
  ) {
    await fromCopilot("ai_recommendations")
      .update({
        status: input.actionType === "viewed" ? "viewed" : input.actionType,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", input.recommendationId);
  }
}

export async function saveConversation(input: {
  userId?: string;
  userEmail?: string;
  role: "user" | "assistant";
  message: string;
  intent?: string;
  responsePayload?: Record<string, unknown>;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await fromCopilot("ai_conversations").insert({
    user_id: input.userId ?? null,
    user_email: input.userEmail ?? null,
    role: input.role,
    message: input.message,
    intent: input.intent ?? null,
    response_payload: input.responsePayload ?? {},
  } as never);
}

export async function saveReport(report: GeneratedReport): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await fromCopilot("ai_reports")
    .insert({
      report_type: report.report_type,
      title: report.title,
      summary: report.summary,
      content: report.content,
    } as never)
    .select("id")
    .single();

  if (error) return null;
  return String((data as { id: string }).id);
}

export async function listRecentReports(
  limit = 5
): Promise<Array<{ id: string; report_type: string; title: string; summary: string; generated_at: string }>> {
  if (!isSupabaseConfigured()) return [];

  const { data } = await fromCopilot("ai_reports")
    .select("id, report_type, title, summary, generated_at")
    .order("generated_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      report_type: String(r.report_type),
      title: String(r.title),
      summary: String(r.summary),
      generated_at: String(r.generated_at),
    };
  });
}
