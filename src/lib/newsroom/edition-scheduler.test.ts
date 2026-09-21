import { describe, expect, it } from "vitest";
import { resolveEditionPublishSlot } from "@/lib/newsroom/edition-scheduler";

describe("resolveEditionPublishSlot", () => {
  it("resolves the slot for an on-time invocation (IST minute 00)", () => {
    // 2026-07-26T06:30:00Z = 2026-07-26 12:00:00 IST
    const result = resolveEditionPublishSlot(new Date("2026-07-26T06:30:00Z"));
    expect(result).toEqual({ ok: true, slot: "12:00" });
  });

  it("still resolves the slot for real observed late invocations", () => {
    // Real ops_cron_runs timestamps where edition-publish fired late and
    // previously skipped its entire slot (minute !== 0):
    //   2026-07-26 12:31:17 UTC -> 2026-07-26 18:01:17 IST
    //   2026-07-26 06:31:33 UTC -> 2026-07-26 12:01:33 IST
    //   2026-07-25 06:31:43 UTC -> 2026-07-25 12:01:43 IST
    expect(
      resolveEditionPublishSlot(new Date("2026-07-26T12:31:17Z"))
    ).toEqual({ ok: true, slot: "18:00" });

    expect(
      resolveEditionPublishSlot(new Date("2026-07-26T06:31:33Z"))
    ).toEqual({ ok: true, slot: "12:00" });

    expect(
      resolveEditionPublishSlot(new Date("2026-07-25T06:31:43Z"))
    ).toEqual({ ok: true, slot: "12:00" });
  });

  it("resolves the slot across 24 hours in the continuous 30-minute newsroom", () => {
    // 2026-07-26T01:30:00Z = 2026-07-26 07:00:00 IST -> 07:00 slot
    const result = resolveEditionPublishSlot(new Date("2026-07-26T01:30:00Z"));
    expect(result).toEqual({ ok: true, slot: "07:00" });
  });
});
