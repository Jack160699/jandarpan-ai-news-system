import { describe, expect, it } from "vitest";
import {
  describeRolloutState,
  getAutonomousRolloutStage,
  isAutonomousKillSwitchOn,
  isAutonomousPublishingEnabled,
} from "@/lib/autonomous/rollout-state";

describe("rollout-state", () => {
  it("defaults to shadow when unset", () => {
    expect(getAutonomousRolloutStage({})).toBe("shadow");
    expect(isAutonomousPublishingEnabled({})).toBe(false);
  });

  it("defaults to shadow for unknown values", () => {
    expect(
      getAutonomousRolloutStage({ AUTONOMOUS_ROLLOUT_STAGE: "experimental" })
    ).toBe("shadow");
  });

  it("stage_1 enables publishing when kill switch off", () => {
    const env = { AUTONOMOUS_ROLLOUT_STAGE: "stage_1" };
    expect(getAutonomousRolloutStage(env)).toBe("stage_1");
    expect(isAutonomousPublishingEnabled(env)).toBe(true);
  });

  it("kill switch disables publishing", () => {
    const env = {
      AUTONOMOUS_ROLLOUT_STAGE: "stage_2",
      AUTONOMOUS_KILL_SWITCH: "1",
    };
    expect(isAutonomousKillSwitchOn(env)).toBe(true);
    expect(isAutonomousPublishingEnabled(env)).toBe(false);
  });

  it("describeRolloutState summarizes", () => {
    const d = describeRolloutState({});
    expect(d.stage).toBe("shadow");
    expect(d.publishingEnabled).toBe(false);
  });
});
