import { describe, expect, it } from "vitest";
import {
  EDITORIAL_GENERATE_JOB_TIMEOUT_MS,
  EDITORIAL_WAKEUP_PRIORITY,
} from "./event-bus";
import { GENERATION_LANE_TARGETS } from "../workers/editorial-generate-observability";

describe("editorial event-bus wake-up priority", () => {
  it("is a finite database-safe value", () => {
    expect(Number.isFinite(EDITORIAL_WAKEUP_PRIORITY)).toBe(true);
    expect(EDITORIAL_WAKEUP_PRIORITY).toBeGreaterThan(0);
  });

  it("does not expire editorial work before the dedicated lane budget", () => {
    expect(EDITORIAL_GENERATE_JOB_TIMEOUT_MS).toBeGreaterThan(
      GENERATION_LANE_TARGETS.budgetMs
    );
    expect(EDITORIAL_GENERATE_JOB_TIMEOUT_MS).toBeLessThan(120_000);
  });
});
