/**
 * SERP Intelligence — tracking orchestrator
 */

import { collectSerpForKeyword, sleep } from "@/lib/serp-intelligence/collector";
import {
  hasSerpProviderConfigured,
  isSerpTrackerEnabled,
  SERP_KEYWORD_DELAY_MS,
  SERP_MAX_KEYWORDS_PER_RUN,
} from "@/lib/serp-intelligence/config";
import { detectOpportunities } from "@/lib/serp-intelligence/opportunity-detector";
import {
  buildRankingUpdate,
  detectLostRankings,
} from "@/lib/serp-intelligence/rank-tracker";
import { synthesizeAiActions, mergeOpportunityActions } from "@/lib/serp-intelligence/ai-actions";
import { logSerp, errorSerp } from "@/lib/serp-intelligence/logger";
import {
  clearOpenOpportunities,
  deleteLostRankings,
  insertMovements,
  insertOpportunities,
  insertSnapshot,
  loadEnabledKeywords,
  loadExistingRankingsForKeyword,
  upsertRanking,
} from "@/lib/serp-intelligence/repository";
import type { SerpTrackerResult } from "@/lib/serp-intelligence/types";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function runSerpTracker(
  now = new Date()
): Promise<SerpTrackerResult> {
  const startedAt = Date.now();

  if (!isSerpTrackerEnabled()) {
    return {
      ok: true,
      status: "skipped",
      durationMs: Date.now() - startedAt,
      keywordsProcessed: 0,
      snapshotsSaved: 0,
      rankChanges: 0,
      newKeywords: 0,
      lostKeywords: 0,
      opportunitiesFound: 0,
      errors: [],
      skippedReason: "SEO_SERP_TRACKER_not_enabled",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      status: "failed",
      durationMs: Date.now() - startedAt,
      keywordsProcessed: 0,
      snapshotsSaved: 0,
      rankChanges: 0,
      newKeywords: 0,
      lostKeywords: 0,
      opportunitiesFound: 0,
      errors: ["supabase_not_configured"],
    };
  }

  if (!hasSerpProviderConfigured()) {
    return {
      ok: true,
      status: "skipped",
      durationMs: Date.now() - startedAt,
      keywordsProcessed: 0,
      snapshotsSaved: 0,
      rankChanges: 0,
      newKeywords: 0,
      lostKeywords: 0,
      opportunitiesFound: 0,
      errors: [],
      skippedReason: "serp_provider_not_configured",
    };
  }

  logSerp("tracking_started", { ts: now.toISOString() });

  const errors: string[] = [];
  let keywordsProcessed = 0;
  let snapshotsSaved = 0;
  let rankChanges = 0;
  let newKeywords = 0;
  let lostKeywords = 0;
  let opportunitiesFound = 0;

  try {
    const keywords = await loadEnabledKeywords(SERP_MAX_KEYWORDS_PER_RUN);
    const keywordMap = new Map(keywords.map((k) => [k.id, k.keyword]));
    const allOpportunities: ReturnType<typeof detectOpportunities> = [];

    await clearOpenOpportunities();

    for (const kw of keywords) {
      try {
        const snapshot = await collectSerpForKeyword(kw.keyword);
        if (!snapshot) {
          errors.push(`no_snapshot:${kw.keyword}`);
          continue;
        }

        const capturedAt = now.toISOString();
        const snapshotId = await insertSnapshot(kw.id, snapshot, capturedAt);
        snapshotsSaved += 1;
        keywordsProcessed += 1;

        const existingRankings = await loadExistingRankingsForKeyword(kw.id);
        const existingByUrl = new Map(existingRankings.map((r) => [r.url, r]));
        const currentUrls = new Set<string>();
        const movementsForKeyword: Parameters<typeof insertMovements>[0] = [];

        for (const result of snapshot.organic_results) {
          currentUrls.add(result.url);
          const existing = existingByUrl.get(result.url);
          const { ranking, movement } = buildRankingUpdate(
            kw.id,
            result,
            existing,
            capturedAt
          );
          await upsertRanking(snapshotId, ranking);

          if (movement) {
            movementsForKeyword.push(movement);
            if (movement.movement_type === "new_ranking" && movement.is_jandarpan) {
              newKeywords += 1;
            }
            if (movement.movement_type !== "unchanged") {
              rankChanges += 1;
            }
          }
        }

        const lost = detectLostRankings(
          kw.id,
          existingRankings,
          currentUrls,
          capturedAt
        );
        for (const m of lost) {
          if (m.is_jandarpan) lostKeywords += 1;
          movementsForKeyword.push(m);
          rankChanges += 1;
        }

        await deleteLostRankings(kw.id, currentUrls);
        await insertMovements(movementsForKeyword);

        const opps = detectOpportunities(kw.id, snapshot);
        allOpportunities.push(...opps);

        await sleep(SERP_KEYWORD_DELAY_MS);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "keyword_tracking_failed";
        errors.push(`${kw.keyword}:${msg}`);
        errorSerp("tracking_completed", { keyword: kw.keyword, error: msg });
      }
    }

    const aiActions = synthesizeAiActions(allOpportunities, keywordMap);
    const enriched = mergeOpportunityActions(allOpportunities, aiActions);
    opportunitiesFound = await insertOpportunities(enriched);

    logSerp("tracking_completed", {
      keywordsProcessed,
      snapshotsSaved,
      durationMs: Date.now() - startedAt,
    });
    logSerp("rank_changes", { count: rankChanges });
    logSerp("new_keywords", { count: newKeywords });
    logSerp("lost_keywords", { count: lostKeywords });
    logSerp("opportunities_found", { count: opportunitiesFound });

    return {
      ok: errors.length === 0 || keywordsProcessed > 0,
      status: keywordsProcessed > 0 ? "completed" : "failed",
      durationMs: Date.now() - startedAt,
      keywordsProcessed,
      snapshotsSaved,
      rankChanges,
      newKeywords,
      lostKeywords,
      opportunitiesFound,
      errors,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "serp_tracker_failed";
    errorSerp("tracking_completed", { error: msg });
    return {
      ok: false,
      status: "failed",
      durationMs: Date.now() - startedAt,
      keywordsProcessed,
      snapshotsSaved,
      rankChanges,
      newKeywords,
      lostKeywords,
      opportunitiesFound,
      errors: [...errors, msg],
    };
  }
}
