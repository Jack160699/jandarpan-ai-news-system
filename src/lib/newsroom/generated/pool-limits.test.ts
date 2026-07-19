import { describe, expect, it } from "vitest";
import {
  clampGeneratedPoolLimit,
  GENERATED_POOL_HARD_CAPS,
  isStatementTimeoutError,
} from "@/lib/newsroom/generated/pool-limits";

describe("generated pool limits", () => {
  it("clamps full select below hard cap", () => {
    expect(clampGeneratedPoolLimit(800, "full")).toBe(GENERATED_POOL_HARD_CAPS.full);
    expect(clampGeneratedPoolLimit(50, "full")).toBe(50);
  });

  it("clamps sitemap select and never allows unbounded", () => {
    expect(clampGeneratedPoolLimit(10_000, "sitemap")).toBe(
      GENERATED_POOL_HARD_CAPS.sitemap
    );
    expect(clampGeneratedPoolLimit(0, "sitemap")).toBe(1);
  });

  it("detects PostgreSQL 57014 / statement timeout messages", () => {
    expect(isStatementTimeoutError("57014")).toBe(true);
    expect(
      isStatementTimeoutError(
        "canceling statement due to statement timeout"
      )
    ).toBe(true);
    expect(isStatementTimeoutError("query_timeout_4000ms")).toBe(true);
    expect(isStatementTimeoutError("relation does not exist")).toBe(false);
  });
});
