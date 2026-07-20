import { describe, expect, it } from "vitest";
import {
  formatIstDay,
  getIstDayBounds,
  istWallTimeToUtcDate,
} from "@/lib/autonomous/ist-day";

describe("ist-day", () => {
  it("formats Asia/Kolkata calendar day", () => {
    // 2026-07-20 22:30 UTC = 2026-07-21 04:00 IST
    const d = new Date("2026-07-20T22:30:00.000Z");
    expect(formatIstDay(d)).toBe("2026-07-21");
  });

  it("returns inclusive start / exclusive end ISO for an IST day", () => {
    const bounds = getIstDayBounds("2026-07-21");
    expect(bounds.day).toBe("2026-07-21");
    // IST midnight 2026-07-21 = 2026-07-20T18:30:00.000Z
    expect(bounds.startIso).toBe("2026-07-20T18:30:00.000Z");
    // Next IST midnight = 2026-07-21T18:30:00.000Z
    expect(bounds.endIso).toBe("2026-07-21T18:30:00.000Z");
  });

  it("converts IST wall time to UTC correctly", () => {
    const noonIst = istWallTimeToUtcDate("2026-07-21", 12, 0, 0, 0);
    expect(noonIst.toISOString()).toBe("2026-07-21T06:30:00.000Z");
  });

  it("getIstDayBounds(now) matches formatIstDay(now)", () => {
    const now = new Date("2026-07-21T02:00:00.000Z");
    const bounds = getIstDayBounds(now);
    expect(bounds.day).toBe(formatIstDay(now));
    expect(new Date(bounds.startIso).getTime()).toBeLessThan(now.getTime());
    expect(new Date(bounds.endIso).getTime()).toBeGreaterThan(now.getTime());
  });
});
