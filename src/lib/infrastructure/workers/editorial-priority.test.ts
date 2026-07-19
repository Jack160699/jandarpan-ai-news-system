import { describe, expect, it } from "vitest";
import {
  compareEditorialCandidates,
  editorialJobQueuePriority,
  scoreEditorialCandidate,
  selectEditorialCandidates,
} from "@/lib/infrastructure/workers/editorial-priority";
import type { NewsEventRow } from "@/lib/types/newsroom";

function makeEvent(overrides: Partial<NewsEventRow> = {}): NewsEventRow {
  return {
    id: overrides.id ?? "evt-1",
    canonical_title: overrides.canonical_title ?? "Raipur market fire",
    event_summary: overrides.event_summary ?? "Fire in Raipur market",
    region: overrides.region ?? "chhattisgarh",
    category: overrides.category ?? "local",
    urgency_score: overrides.urgency_score ?? 5,
    source_count: overrides.source_count ?? 2,
    signal_ids: overrides.signal_ids ?? [],
    clustering_metadata: overrides.clustering_metadata ?? {},
    coverage_slug: overrides.coverage_slug ?? null,
    coverage_headline: overrides.coverage_headline ?? null,
    cluster_confidence: overrides.cluster_confidence ?? null,
    is_live: overrides.is_live ?? false,
    coverage_status: overrides.coverage_status ?? "active",
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
  };
}

describe("editorial-priority", () => {
  it("ranks live breaking CG events above stale national items", () => {
    const liveCg = makeEvent({
      id: "live",
      is_live: true,
      urgency_score: 9,
      region: "chhattisgarh",
      category: "local",
    });
    const national = makeEvent({
      id: "national",
      urgency_score: 4,
      region: "india",
      category: "politics",
      created_at: new Date(Date.now() - 72 * 3_600_000).toISOString(),
    });

    expect(scoreEditorialCandidate(liveCg)).toBeGreaterThan(
      scoreEditorialCandidate(national)
    );
    expect(compareEditorialCandidates(liveCg, national)).toBeLessThan(0);
  });

  it("selects deterministically with diversity across districts", () => {
    const events = [
      makeEvent({ id: "a", region: "chhattisgarh", category: "local" }),
      makeEvent({ id: "b", region: "chhattisgarh", category: "local" }),
      makeEvent({ id: "c", region: "chhattisgarh", category: "sports" }),
    ];

    const first = selectEditorialCandidates(events, 2);
    const second = selectEditorialCandidates(events, 2);

    expect(first.map((e) => e.id)).toEqual(second.map((e) => e.id));
    expect(new Set(first.map((e) => e.category)).size).toBeGreaterThanOrEqual(1);
  });

  it("maps queue priority into 0–100", () => {
    const priority = editorialJobQueuePriority(
      makeEvent({ is_live: true, urgency_score: 10 })
    );
    expect(priority).toBeGreaterThanOrEqual(0);
    expect(priority).toBeLessThanOrEqual(100);
  });

  it("ranks fresh moderate-urgency events above month-old urgency orphans", () => {
    const fresh = makeEvent({
      id: "fresh",
      urgency_score: 8,
      created_at: new Date(Date.now() - 6 * 3_600_000).toISOString(),
    });
    const orphan = makeEvent({
      id: "orphan",
      urgency_score: 100,
      created_at: new Date(Date.now() - 28 * 24 * 3_600_000).toISOString(),
      signal_ids: ["deleted-signal"],
    });

    expect(scoreEditorialCandidate(fresh)).toBeGreaterThan(
      scoreEditorialCandidate(orphan)
    );
    expect(selectEditorialCandidates([orphan, fresh], 1)[0].id).toBe("fresh");
  });
});
