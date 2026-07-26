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

  it("rejects invocations well outside the tolerance window", () => {
    // IST minute 06 — past the 5-minute tolerance.
    const result = resolveEditionPublishSlot(new Date("2026-07-26T06:36:00Z"));
    expect(result).toEqual({ ok: false, reason: "outside_slot_minute" });
  });

  it("rejects invocations at a non-slot hour even at minute 00", () => {
    // 2026-07-26T01:30:00Z = 2026-07-26 07:00:00 IST -> minute 0, but 07:00
    // is not one of the six edition slots.
    const result = resolveEditionPublishSlot(new Date("2026-07-26T01:30:00Z"));
    expect(result).toEqual({ ok: false, reason: "outside_slot_hour" });
  });
});
