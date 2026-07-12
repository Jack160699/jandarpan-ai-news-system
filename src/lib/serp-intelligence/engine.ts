/**
 * SERP Intelligence — tracking orchestrator (hybrid strategy)
 *
 * GSC is primary ranking intelligence; SerpAPI verifies only high-value keywords
 * within a strict monthly/daily quota budget.
 */

import { collectSerpForKeyword, sleep } from "@/lib/serp-intelligence/collector";
import {
  hasSerpProviderConfigured,
  isSerpTrackerEnabled,
  SERP_KEYWORD_DELAY_MS,
} from "@/lib/serp-intelligence/config";
import { detectOpportunities } from "@/lib/serp-intelligence/opportunity-detector";
import {
  buildRankingUpdate,
  detectLostRankings,
} from "@/lib/serp-intelligence/rank-tracker";
import { synthesizeAiActions, mergeOpportunityActions } from "@/lib/serp-intelligence/ai-actions";
import { logSerp, errorSerp } from "@/lib/serp-intelligence/logger";
import {
  loadKeywordPrioritizationContext,
  prioritizeKeywords,
} from "@/lib/serp-intelligence/keyword-prioritizer";
import {
  canPerformSerpSearch,
  getSerpQuotaStatus,
  recordSerpSearch,
  recordSerpSkipped,
} from "@/lib/serp-intelligence/quota-manager";
import {
  clearOpenOpportunities,
  deleteLostRankings,
  insertMovements,
  insertOpportunities,
  insertSnapshot,
  loadAllEnabledKeywords,
  loadExistingRankingsForKeyword,
  upsertRanking,
} from "@/lib/serp-intelligence/repository";
import type { SerpTrackerResult } from "@/lib/serp-intelligence/types";
import { isSupabaseConfigured } from "@/lib/supabase";

function emptyTrackerResult(
  startedAt: number,
  overrides: Partial<SerpTrackerResult> = {}
): SerpTrackerResult {
  const quota = overrides.quota;
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
    serpSearchesPerformed: 0,
    serpSearchesSkipped: 0,
    intelligenceMode: quota?.mode ?? "gsc_only",
    quota: quota ?? {
      monthlyLimit: 250,
      reservedSearches: 25,
      usableMonthlyLimit: 225,
      searchesUsed: 0,
      searchesRemaining: 225,
      searchesSkipped: 0,
      keywordsCheckedToday: 0,
      dailyMax: 8,
      dailyUsed: 0,
      dailyRemaining: 8,
      canSearch: false,
      quotaExhausted: true,
      mode: "gsc_only",
      periodMonth: "",
      estimatedResetAt: "",
    },
    errors: [],
    ...overrides,
  };
}

export async function runSerpTracker(
  now = new Date()
): Promise<SerpTrackerResult> {
  const startedAt = Date.now();
  const quotaAtStart = await getSerpQuotaStatus(now);

  if (!isSerpTrackerEnabled()) {
    return emptyTrackerResult(startedAt, {
      skippedReason: "SEO_SERP_TRACKER_not_enabled",
      quota: quotaAtStart,
    });
  }

  if (!isSupabaseConfigured()) {
    return {
      ...emptyTrackerResult(startedAt, { quota: quotaAtStart }),
      ok: false,
      status: "failed",
      errors: ["supabase_not_configured"],
    };
  }

  if (!hasSerpProviderConfigured()) {
    return emptyTrackerResult(startedAt, {
      skippedReason: "serp_provider_not_configured",
      quota: quotaAtStart,
    });
  }

  logSerp("tracking_started", {
    ts: now.toISOString(),
    mode: quotaAtStart.mode,
    quotaRemaining: quotaAtStart.searchesRemaining,
    dailyRemaining: quotaAtStart.dailyRemaining,
  });

  if (quotaAtStart.quotaExhausted) {
    logSerp("gsc_only_mode", {
      reason: "quota_exhausted",
      searchesUsed: quotaAtStart.searchesUsed,
      dailyUsed: quotaAtStart.dailyUsed,
    });
    return emptyTrackerResult(startedAt, {
      status: "completed",
      skippedReason: "serp_quota_exhausted_gsc_only",
      intelligenceMode: "gsc_only",
      quota: quotaAtStart,
    });
  }

  const errors: string[] = [];
  let keywordsProcessed = 0;
  let snapshotsSaved = 0;
  let rankChanges = 0;
  let newKeywords = 0;
  let lostKeywords = 0;
  let opportunitiesFound = 0;
  let serpSearchesPerformed = 0;
  let serpSearchesSkipped = 0;
  let quota = quotaAtStart;

  try {
    const [allKeywords, prioritizationContext] = await Promise.all([
      loadAllEnabledKeywords(),
      loadKeywordPrioritizationContext(),
    ]);

    const prioritized = prioritizeKeywords(allKeywords, prioritizationContext);
    const keywordMap = new Map(
      prioritized.map((entry) => [entry.keyword.id, entry.keyword.keyword])
    );
    const allOpportunities: ReturnType<typeof detectOpportunities> = [];

    await clearOpenOpportunities();

    for (const entry of prioritized) {
      const kw = entry.keyword;

      const canSearch = await canPerformSerpSearch(now);
      if (!canSearch) {
        const reason =
          quota.searchesRemaining <= 0
            ? "monthly_quota_exhausted"
            : "daily_quota_exhausted";
        quota = await recordSerpSkipped({
          keyword: kw.keyword,
          keywordId: kw.id,
          reason,
          priorityScore: entry.priorityScore,
          now,
        });
        serpSearchesSkipped += 1;
        continue;
      }

      try {
        const snapshot = await collectSerpForKeyword(kw.keyword);
        if (!snapshot) {
          errors.push(`no_snapshot:${kw.keyword}`);
          continue;
        }

        quota = await recordSerpSearch({
          keyword: kw.keyword,
          keywordId: kw.id,
          priorityScore: entry.priorityScore,
          now,
        });
        serpSearchesPerformed += 1;

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

    const finalQuota = await getSerpQuotaStatus(now);

    logSerp("tracking_completed", {
      keywordsProcessed,
      snapshotsSaved,
      serpSearchesPerformed,
      serpSearchesSkipped,
      mode: finalQuota.mode,
      durationMs: Date.now() - startedAt,
    });
    logSerp("rank_changes", { count: rankChanges });
    logSerp("new_keywords", { count: newKeywords });
    logSerp("lost_keywords", { count: lostKeywords });
    logSerp("opportunities_found", { count: opportunitiesFound });

    if (finalQuota.quotaExhausted) {
      logSerp("gsc_only_mode", {
        reason: "quota_exhausted_after_run",
        searchesUsed: finalQuota.searchesUsed,
      });
    }

    return {
      ok: errors.length === 0 || keywordsProcessed > 0 || serpSearchesSkipped > 0,
      status:
        keywordsProcessed > 0 || serpSearchesSkipped > 0 ? "completed" : "failed",
      durationMs: Date.now() - startedAt,
      keywordsProcessed,
      snapshotsSaved,
      rankChanges,
      newKeywords,
      lostKeywords,
      opportunitiesFound,
      serpSearchesPerformed,
      serpSearchesSkipped,
      intelligenceMode: finalQuota.mode,
      quota: finalQuota,
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
      serpSearchesPerformed,
      serpSearchesSkipped,
      intelligenceMode: quota.mode,
      quota,
      errors: [...errors, msg],
    };
  }
}
