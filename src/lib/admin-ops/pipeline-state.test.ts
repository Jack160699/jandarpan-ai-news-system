import { describe, expect, it } from "vitest";
import { derivePipelineState, UNKNOWN_SCHEDULER_CONTROL } from "./snapshot";

const on = { known: true, enabled: true, pruneEnabled: false, lastPruneAt: null };
const off = { ...on, enabled: false };

describe("pipeline state (running / stalled / paused)", () => {
  it("paused when the kill switch is OFF, whatever the freshness", () => {
    expect(derivePipelineState({ control: off, paceMessage: "On pace", lagMinutes: 5 }).state).toBe("paused");
    expect(derivePipelineState({ control: off, paceMessage: "Publishing pipeline stalled", lagMinutes: 5000 }).state).toBe("paused");
  });

  it("stalled when publishing has stopped and the scheduler is on", () => {
    const s = derivePipelineState({ control: on, paceMessage: "Publishing pipeline stalled", lagMinutes: 2900 });
    expect(s.state).toBe("stalled");
    expect(s.reason).toContain("48 h");
  });

  it("running otherwise, with the age of the last publish", () => {
    expect(derivePipelineState({ control: on, paceMessage: "On pace", lagMinutes: 12 })).toEqual({ state: "running", reason: "Last publish 12 min ago" });
    expect(derivePipelineState({ control: on, paceMessage: "Below production pace", lagMinutes: 200 }).state).toBe("running");
  });

  it("never assumes the scheduler is on when its state cannot be read", () => {
    const unknown = derivePipelineState({ control: UNKNOWN_SCHEDULER_CONTROL, paceMessage: "Publishing pipeline stalled", lagMinutes: null });
    expect(unknown.state).toBe("stalled");
    expect(unknown.reason).toMatch(/ever been published/);
  });
});
