import { describe, expect, it } from "vitest";
import { resolveDirectEditorialGate } from "@/lib/infrastructure/cron/editorial-generate-policy";

describe("editorial-generate-policy", () => {
  it("always allows dedicated_lane trigger", () => {
    expect(resolveDirectEditorialGate("dedicated_lane")).toEqual({
      allowed: true,
      reason: "dedicated_lane",
    });
  });

  it("denies scheduled_cron with dedicated cron guidance", () => {
    expect(resolveDirectEditorialGate("scheduled_cron")).toEqual({
      allowed: false,
      reason: "use_dedicated_editorial_generate_cron",
    });
  });

  it("still allows manual_override", () => {
    expect(resolveDirectEditorialGate("manual_override")).toEqual({
      allowed: true,
      reason: "manual_override",
    });
  });

  it("still allows vercel_backup", () => {
    expect(resolveDirectEditorialGate("vercel_backup")).toEqual({
      allowed: true,
      reason: "vercel_daily_backup",
    });
  });
});
