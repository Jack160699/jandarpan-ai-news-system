import { describe, expect, it } from "vitest";
import { isSeoExecutionEngineEnabled } from "@/lib/seo-execution/config";

describe("config", () => {
  it("reads execution engine flag", () => {
    const prev = process.env.SEO_EXECUTION_ENGINE;
    process.env.SEO_EXECUTION_ENGINE = "true";
    expect(isSeoExecutionEngineEnabled()).toBe(true);
    process.env.SEO_EXECUTION_ENGINE = prev;
  });
});
