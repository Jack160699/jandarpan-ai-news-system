import { describe, expect, it } from "vitest";
import { classifyNoSignalsForEvent } from "@/lib/news/ai/event-signal-yield";

/**
 * Pure-contract tests for yield repair eligibility.
 * DB-backed execute paths are covered by dry-run ops scripts against prod.
 */
describe("generation-yield-repair eligibility", () => {
  it("does not treat resolvable events as quarantine candidates", () => {
    const c = classifyNoSignalsForEvent({
      event: {
        created_at: new Date(Date.now() - 30 * 24 * 3_600_000).toISOString(),
        is_live: false,
        signal_ids: ["s1"],
      },
      foundSignalCount: 1,
    });
    expect(c.class).toBe("already_resolved");
    expect(c.retryable).toBe(false);
  });

  it("quarantines only obsolete dangling refs, not recent dependency gaps", () => {
    const obsolete = classifyNoSignalsForEvent({
      event: {
        created_at: new Date(Date.now() - 10 * 24 * 3_600_000).toISOString(),
        is_live: false,
        signal_ids: ["gone"],
      },
      foundSignalCount: 0,
    });
    const recent = classifyNoSignalsForEvent({
      event: {
        created_at: new Date(Date.now() - 6 * 3_600_000).toISOString(),
        is_live: false,
        signal_ids: ["gone"],
      },
      foundSignalCount: 0,
    });
    expect(obsolete.class).toBe("obsolete_dangling_signals");
    expect(recent.class).toBe("retryable_dependency_gap");
  });

  it("marks already-generated obsolete dangling as non-retryable", () => {
    const c = classifyNoSignalsForEvent({
      event: {
        created_at: new Date(Date.now() - 40 * 24 * 3_600_000).toISOString(),
        is_live: false,
        signal_ids: ["gone"],
      },
      foundSignalCount: 0,
    });
    expect(c.retryable).toBe(false);
  });
});
