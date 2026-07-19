import { describe, expect, it } from "vitest";
import {
  AUTO_GENERATION_MAX_AGE_HOURS,
  classifyNoSignalsForEvent,
  countFoundSignalsPerEvent,
  filterEventsWithResolvableSignals,
  isWithinAutoGenerationWindow,
  uniqueSignalIds,
} from "@/lib/news/ai/event-signal-yield";

describe("event-signal-yield", () => {
  it("keeps live events in the auto-generation window regardless of age", () => {
    expect(
      isWithinAutoGenerationWindow({
        created_at: new Date(Date.now() - 30 * 24 * 3_600_000).toISOString(),
        is_live: true,
      })
    ).toBe(true);
  });

  it("excludes non-live events older than the auto window", () => {
    expect(
      isWithinAutoGenerationWindow({
        created_at: new Date(
          Date.now() - (AUTO_GENERATION_MAX_AGE_HOURS + 1) * 3_600_000
        ).toISOString(),
        is_live: false,
      })
    ).toBe(false);
  });

  it("classifies recent empty signal_ids as retryable dependency gaps", () => {
    const c = classifyNoSignalsForEvent({
      event: {
        created_at: new Date().toISOString(),
        is_live: false,
        signal_ids: [],
      },
      foundSignalCount: 0,
    });
    expect(c.retryable).toBe(true);
    expect(c.class).toBe("retryable_dependency_gap");
    expect(c.reason).toBe("empty_signal_ids_awaiting_cluster");
  });

  it("classifies old dangling signal ids as obsolete", () => {
    const c = classifyNoSignalsForEvent({
      event: {
        created_at: new Date(Date.now() - 10 * 24 * 3_600_000).toISOString(),
        is_live: false,
        signal_ids: ["sig-missing-1"],
      },
      foundSignalCount: 0,
    });
    expect(c.retryable).toBe(false);
    expect(c.class).toBe("obsolete_dangling_signals");
    expect(c.reason).toBe("dangling_signal_ids_obsolete");
  });

  it("classifies recent dangling signal ids as retryable", () => {
    const c = classifyNoSignalsForEvent({
      event: {
        created_at: new Date(Date.now() - 12 * 3_600_000).toISOString(),
        is_live: false,
        signal_ids: ["sig-missing-1"],
      },
      foundSignalCount: 0,
    });
    expect(c.retryable).toBe(true);
    expect(c.reason).toBe("dangling_signal_ids_recent");
  });

  it("filters to events with at least one resolvable signal", () => {
    const events = [
      { id: "a", signal_ids: ["s1", "s2"] },
      { id: "b", signal_ids: ["missing"] },
      { id: "c", signal_ids: [] },
    ];
    const found = countFoundSignalsPerEvent(
      events,
      new Set(["s1"])
    );
    expect(found.get("a")).toBe(1);
    expect(found.get("b")).toBe(0);
    expect(filterEventsWithResolvableSignals(events, found).map((e) => e.id)).toEqual([
      "a",
    ]);
    expect(uniqueSignalIds(events).sort()).toEqual(["missing", "s1", "s2"]);
  });
});
