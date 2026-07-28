import { describe, expect, it } from "vitest";
import { createExecutionDeadline } from "@/lib/serverless/deadline";
import { withReservedTail } from "./orchestrator";

describe("withReservedTail", () => {
  it("stops well before the parent deadline, leaving the reserved slice for later workers", () => {
    const parent = createExecutionDeadline(90_000); // stopAtMs = 90_000 * 0.82
    const bounded = withReservedTail(parent, 30_000);

    expect(bounded.stopAtMs).toBe(parent.stopAtMs - 30_000);
    expect(bounded.stopAtMs).toBeLessThan(parent.stopAtMs);
  });

  it("timing out the bounded view does not mark the parent as timed out", () => {
    // A tiny budget so the bounded view is already past its stop point.
    const parent = createExecutionDeadline(90_000);
    const bounded = withReservedTail(parent, parent.stopAtMs); // reserve everything

    expect(bounded.shouldStop()).toBe(true);
    expect(bounded.timedOutSafely).toBe(true);
    expect(parent.timedOutSafely).toBe(false);
    expect(parent.hasBudgetFor(1)).toBe(true);
  });

  it("a real parent timeout still propagates to the bounded view", () => {
    const parent = createExecutionDeadline(90_000);
    parent.markTimedOut();
    const bounded = withReservedTail(parent, 30_000);

    expect(bounded.timedOutSafely).toBe(true);
    expect(bounded.hasBudgetFor(1)).toBe(false);
    expect(bounded.shouldStop()).toBe(true);
  });

  it("has budget for work within its reserved slice", () => {
    const parent = createExecutionDeadline(90_000);
    const bounded = withReservedTail(parent, 30_000);

    // parent.stopAtMs = 73_800; bounded.stopAtMs = 43_800 — plenty of headroom
    // immediately after creation.
    expect(bounded.hasBudgetFor(1_000)).toBe(true);
  });
});
