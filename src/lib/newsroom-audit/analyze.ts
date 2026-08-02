/**
 * Daily Newsroom Audit Report — AI executive-summary layer.
 *
 * Takes the deterministic report (collect.ts) and asks a free-first AI
 * provider chain (see router.ts — this operation isn't a recognized chain
 * key, so it falls through to the default writer chain: gemini -> groq ->
 * openrouter -> openai-if-flagged) to turn it into a structured executive
 * summary. The deterministic report is authoritative and must remain fully
 * usable on its own; this function never throws — any failure degrades to
 * an `ai_status: 'unavailable' | 'failed'` result instead.
 */

import { requestChatCompletion } from "@/lib/ai/providers/chat";
import type { AiProviderId } from "@/lib/ai/providers/types";
import type { DeterministicReport } from "@/lib/newsroom-audit/collect";
import { pipelineWarn } from "@/lib/observability/production-log";

export type AiAnalysisAction = {
  action: string;
  expected_impact: string;
  owner_subsystem: string;
  urgency: "low" | "medium" | "high" | "critical";
  automation_eligible: boolean;
  confidence: "low" | "medium" | "high";
  /** Field paths into the DeterministicReport input, e.g. "content_production.articlesPublished.value". */
  evidence_refs: string[];
};

export type AiAnalysisSuccess = {
  status: "healthy" | "warning" | "critical";
  executive_summary: string;
  achievements: string[];
  problems: string[];
  warnings: string[];
  actions: AiAnalysisAction[];
  provider: AiProviderId | null;
  model: string | null;
  ai_status: "completed";
};

export type AiAnalysisUnavailable = {
  ai_status: "unavailable" | "failed";
  reason: string;
};

export type AiAnalysisResult = AiAnalysisSuccess | AiAnalysisUnavailable;

const OPERATION = "newsroom_audit_analysis";

const SYSTEM_PROMPT = `You are the senior newsroom operations analyst for Jan Darpan, a Hindi-first
regional news platform. You are given a JSON "deterministic report" — every
number in it came from a real database query for one IST calendar day. Some
fields may be {"status":"unavailable","value":null,"reason":"..."} — that
means the metric could not be measured, NOT that the value is zero. Never
treat an unavailable field as zero and never invent a number that is not
present in the input.

Respond with ONLY a single JSON object (no markdown fences, no prose outside
the JSON) matching exactly this schema:
{
  "status": "healthy" | "warning" | "critical",
  "executive_summary": string (2-4 sentences, plain language, Hindi-first newsroom audience),
  "achievements": string[] (notable positives, cite numbers from the input),
  "problems": string[] (critical issues found in the data),
  "warnings": string[] (lower-severity concerns worth watching),
  "actions": [
    {
      "action": string,
      "expected_impact": string,
      "owner_subsystem": string (e.g. "editorial_pipeline", "ai_providers", "images", "seo"),
      "urgency": "low" | "medium" | "high" | "critical",
      "automation_eligible": boolean,
      "confidence": "low" | "medium" | "high",
      "evidence_refs": string[] (dot-path(s) into the input JSON that justify this action, e.g. "quality.missingHeroImage.value")
    }
  ]
}

Hard rules:
- Every action MUST include at least one evidence_refs entry pointing at a real field path in the input.
- Never invent numbers, percentages, or facts that are not present in the input JSON.
- If a section is entirely unavailable, do not speculate about its contents — note the gap instead.
- Keep the executive_summary factual and specific, not generic boilerplate.`;

function stripMarkdownFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed;
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function coerceActions(value: unknown): AiAnalysisAction[] {
  if (!Array.isArray(value)) return [];
  const out: AiAnalysisAction[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    if (typeof raw.action !== "string" || !raw.action.trim()) continue;
    const evidenceRefs = coerceStringArray(raw.evidence_refs);
    if (!evidenceRefs.length) continue; // hard rule: every action must cite evidence
    const urgency = raw.urgency;
    const confidence = raw.confidence;
    out.push({
      action: raw.action,
      expected_impact: typeof raw.expected_impact === "string" ? raw.expected_impact : "",
      owner_subsystem: typeof raw.owner_subsystem === "string" ? raw.owner_subsystem : "unassigned",
      urgency:
        urgency === "low" || urgency === "medium" || urgency === "high" || urgency === "critical"
          ? urgency
          : "medium",
      automation_eligible: Boolean(raw.automation_eligible),
      confidence: confidence === "low" || confidence === "high" ? confidence : "medium",
      evidence_refs: evidenceRefs,
    });
  }
  return out;
}

function parseAnalysis(content: string): AiAnalysisSuccess | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripMarkdownFences(content));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const raw = parsed as Record<string, unknown>;
  const status = raw.status;
  if (status !== "healthy" && status !== "warning" && status !== "critical") return null;
  if (typeof raw.executive_summary !== "string" || !raw.executive_summary.trim()) return null;

  return {
    status,
    executive_summary: raw.executive_summary,
    achievements: coerceStringArray(raw.achievements),
    problems: coerceStringArray(raw.problems),
    warnings: coerceStringArray(raw.warnings),
    actions: coerceActions(raw.actions),
    provider: null,
    model: null,
    ai_status: "completed",
  };
}

/**
 * Ask the free-first AI provider chain for a structured executive summary
 * of a deterministic newsroom report. Never throws — degrades to
 * `ai_status: 'unavailable' | 'failed'` on any error so the deterministic
 * report always remains usable standalone.
 */
export async function analyzeDailyReport(
  deterministic: DeterministicReport
): Promise<AiAnalysisResult> {
  try {
    const result = await requestChatCompletion({
      operation: OPERATION,
      system: SYSTEM_PROMPT,
      user: JSON.stringify(deterministic),
      jsonMode: true,
      temperature: 0.2,
      maxTokens: 2000,
      context: { worker: "newsroom_audit", cron: "newsroom-daily-report" },
    });

    if (!result.ok) {
      return { ai_status: "unavailable", reason: result.error.message };
    }

    const parsed = parseAnalysis(result.content);
    if (!parsed) {
      pipelineWarn("[newsroom_audit_analysis_parse_failed]", {
        provider: result.provider,
        preview: result.content.slice(0, 400),
      });
      return { ai_status: "failed", reason: "ai_response_not_valid_json_schema" };
    }

    return { ...parsed, provider: result.provider, model: null };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    pipelineWarn("[newsroom_audit_analysis_error]", { reason });
    return { ai_status: "unavailable", reason };
  }
}
