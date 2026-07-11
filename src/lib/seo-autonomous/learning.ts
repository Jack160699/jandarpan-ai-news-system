/**
 * Stage 8 — Learning from outcomes
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { logAutonomous } from "@/lib/seo-autonomous/logger";

type AutonomousTable = "seo_learning" | "seo_action_results";

function fromTable(table: AutonomousTable) {
  return createAdminServerClient().from(table as never);
}

export async function getLearningConfidenceBoost(
  actionType: string,
  fieldKey: string
): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const { data } = await fromTable("seo_learning")
    .select("outcome_score, sample_count")
    .eq("action_type", actionType)
    .eq("field_key", fieldKey)
    .eq("source", "autonomous")
    .maybeSingle();

  if (!data) return 0;
  const row = data as { outcome_score: number; sample_count: number };
  if (row.sample_count < 3) return 0;

  // outcome_score is -1 to 1; boost/penalize confidence by up to ±0.1
  return Math.max(-0.1, Math.min(0.1, row.outcome_score * 0.1));
}

export async function recordLearning(input: {
  actionType: string;
  fieldKey: string;
  confidence: number;
  outcomeScore: number;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { data: existing } = await fromTable("seo_learning")
    .select("*")
    .eq("action_type", input.actionType)
    .eq("field_key", input.fieldKey)
    .eq("source", "autonomous")
    .maybeSingle();

  if (existing) {
    const row = existing as {
      outcome_score: number;
      sample_count: number;
      avg_confidence: number;
    };
    const n = row.sample_count + 1;
    const newScore =
      (row.outcome_score * row.sample_count + input.outcomeScore) / n;
    const newConf =
      (row.avg_confidence * row.sample_count + input.confidence) / n;

    await fromTable("seo_learning")
      .update({
        outcome_score: newScore,
        sample_count: n,
        avg_confidence: newConf,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("action_type", input.actionType)
      .eq("field_key", input.fieldKey)
      .eq("source", "autonomous");
  } else {
    await fromTable("seo_learning").insert({
      action_type: input.actionType,
      field_key: input.fieldKey,
      source: "autonomous",
      outcome_score: input.outcomeScore,
      sample_count: 1,
      avg_confidence: input.confidence,
    } as never);
  }

  logAutonomous("learning_updated", {
    actionType: input.actionType,
    fieldKey: input.fieldKey,
    outcomeScore: input.outcomeScore,
  });
}

/**
 * Compute outcome score from measurement deltas.
 * Positive = improvement, negative = regression.
 */
export function computeOutcomeScore(metrics: Array<{
  metric_type: string;
  delta: number | null;
  current_value: number | null;
}>): number {
  let score = 0;
  let count = 0;

  for (const m of metrics) {
    if (m.delta != null) {
      if (m.metric_type === "ctr" || m.metric_type === "impressions") {
        score += m.delta > 0 ? 1 : m.delta < 0 ? -1 : 0;
        count++;
      } else if (m.metric_type === "position" || m.metric_type === "ranking") {
        score += m.delta < 0 ? 1 : m.delta > 0 ? -1 : 0;
        count++;
      }
    }
  }

  if (count === 0) {
    // Verification success without metrics yet — neutral-positive
    return 0.2;
  }

  return Math.max(-1, Math.min(1, score / count));
}

export async function learnFromAction(input: {
  actionType: string;
  fieldKey: string;
  confidence: number;
  verificationOk: boolean;
}): Promise<void> {
  const outcomeScore = input.verificationOk ? 0.3 : -0.5;
  await recordLearning({
    actionType: input.actionType,
    fieldKey: input.fieldKey,
    confidence: input.confidence,
    outcomeScore,
  });
}
