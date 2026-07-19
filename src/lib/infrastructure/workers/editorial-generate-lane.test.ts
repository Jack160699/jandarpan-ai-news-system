import { describe, expect, it } from "vitest";
import { classifyLaneOutcome } from "@/lib/infrastructure/workers/editorial-generate-lane";

describe("classifyLaneOutcome", () => {
  it("returns success for a clean batch", () => {
    expect(
      classifyLaneOutcome({
        batch: { processed: 2, completed: 2, failed: 0, dead: 0 },
        incidents: [],
      })
    ).toBe("success");
  });

  it("returns failed when all claimed work dies with no completions", () => {
    expect(
      classifyLaneOutcome({
        batch: { processed: 1, completed: 0, failed: 0, dead: 1 },
        incidents: [],
      })
    ).toBe("failed");
  });

  it("keeps a useful batch degraded when historical dead letters exist", () => {
    expect(
      classifyLaneOutcome({
        batch: { processed: 2, completed: 2, failed: 0, dead: 0 },
        incidents: [
          {
            code: "dead_letters",
            severity: "critical",
            detail: "1 dead job",
          },
        ],
      })
    ).toBe("degraded");
  });

  it("returns degraded for partial runs or warning incidents", () => {
    expect(
      classifyLaneOutcome({
        batch: { processed: 2, completed: 1, failed: 0, dead: 0, partial: true },
        incidents: [],
      })
    ).toBe("degraded");

    expect(
      classifyLaneOutcome({
        batch: { processed: 1, completed: 1, failed: 0, dead: 0 },
        incidents: [
          {
            code: "queue_age_exceeded",
            severity: "warning",
            detail: "backlog",
          },
        ],
      })
    ).toBe("degraded");
  });

  it("returns degraded when skipped for gate reasons", () => {
    expect(
      classifyLaneOutcome({
        batch: { processed: 0, completed: 0, failed: 0, dead: 0 },
        incidents: [],
        skipped: true,
        reason: "deadline_precheck",
      })
    ).toBe("degraded");
  });
});
