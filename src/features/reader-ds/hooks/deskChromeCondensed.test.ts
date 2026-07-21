import { describe, expect, it } from "vitest";
import {
  DESK_CHROME_ENTER_Y,
  DESK_CHROME_EXIT_Y,
  resolveDeskChromeCondensed,
} from "./deskChromeCondensed";

describe("resolveDeskChromeCondensed", () => {
  it("stays expanded below the enter threshold", () => {
    expect(resolveDeskChromeCondensed(0, false)).toBe(false);
    expect(resolveDeskChromeCondensed(DESK_CHROME_ENTER_Y, false)).toBe(false);
    expect(resolveDeskChromeCondensed(DESK_CHROME_ENTER_Y + 1, false)).toBe(true);
  });

  it("does not oscillate through the classic 72–188 collapse band", () => {
    let condensed = false;
    const samples: boolean[] = [];

    // Simulate layout collapse yanking scroll toward 0 after enter (old bug path).
    const path = [60, 74, 80, 10, 40, 72, 90, 50, 30, 20, 10, 0, 80, 130, 100];
    for (const y of path) {
      condensed = resolveDeskChromeCondensed(y, condensed);
      samples.push(condensed);
    }

    // Once entered at 130-ish, stay condensed until below EXIT — no thrash on 10/40/72.
    expect(samples.filter((v, i) => i > 0 && v !== samples[i - 1]).length).toBeLessThanOrEqual(3);

    condensed = false;
    condensed = resolveDeskChromeCondensed(170, condensed);
    expect(condensed).toBe(true);
    // After a ~116px sticky collapse, scroll lands ~54 — must stay condensed (exit is 40).
    expect(resolveDeskChromeCondensed(54, condensed)).toBe(true);
    expect(resolveDeskChromeCondensed(DESK_CHROME_EXIT_Y, condensed)).toBe(true);
    expect(resolveDeskChromeCondensed(DESK_CHROME_EXIT_Y - 1, condensed)).toBe(false);
  });

  it("keeps a single stable state while jittering around the enter edge", () => {
    let condensed = false;
    condensed = resolveDeskChromeCondensed(170, condensed);
    expect(condensed).toBe(true);

    const flips: boolean[] = [];
    for (let i = 0; i < 30; i++) {
      const y = 100 + (i % 2 === 0 ? 12 : -12);
      const next = resolveDeskChromeCondensed(y, condensed);
      if (next !== condensed) flips.push(next);
      condensed = next;
    }
    expect(flips).toHaveLength(0);
    expect(condensed).toBe(true);
  });

  it("treats non-finite scroll as 0", () => {
    expect(resolveDeskChromeCondensed(Number.NaN, true)).toBe(false);
    expect(resolveDeskChromeCondensed(Number.POSITIVE_INFINITY, false)).toBe(false);
  });
});
