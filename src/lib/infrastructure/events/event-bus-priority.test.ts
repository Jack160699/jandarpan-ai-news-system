import { describe, expect, it } from "vitest";
import { EDITORIAL_WAKEUP_PRIORITY } from "./event-bus";

describe("editorial event-bus wake-up priority", () => {
  it("is a finite database-safe value", () => {
    expect(Number.isFinite(EDITORIAL_WAKEUP_PRIORITY)).toBe(true);
    expect(EDITORIAL_WAKEUP_PRIORITY).toBeGreaterThan(0);
  });
});
