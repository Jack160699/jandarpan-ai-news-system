import { describe, expect, it } from "vitest";
import { isSystemValidationEnabled } from "@/lib/system-validation/config";

describe("config", () => {
  it("reads validation feature flag", () => {
    const prev = process.env.SYSTEM_VALIDATION_ENGINE;
    process.env.SYSTEM_VALIDATION_ENGINE = "true";
    expect(isSystemValidationEnabled()).toBe(true);
    process.env.SYSTEM_VALIDATION_ENGINE = prev;
  });
});
