import { describe, expect, it } from "vitest";
import { allowedDecisions, checkDecision, requestBody, type QueueFlag } from "@/features/user-news/moderation-model";

const review: QueueFlag[] = [{ code: "named_person_accusation", severity: "review" }];
const block: QueueFlag[] = [{ code: "personal_data_exposure", severity: "block" }];
const base = { reasonText: "", flags: [] as QueueFlag[], acknowledged: false, confirmedDistrict: "raipur" as string | null };

describe("moderation model", () => {
  it("reject / block / request_edit / unpublish need a written reason", () => {
    for (const decision of ["reject", "block", "request_edit", "unpublish"] as const) {
      expect(checkDecision({ ...base, decision }).ok).toBe(false);
      expect(checkDecision({ ...base, decision, reasonText: "Cannot verify this claim." }).ok).toBe(true);
    }
  });

  it("approve needs flags acknowledged, and a blocking flag can never be approved", () => {
    expect(checkDecision({ ...base, decision: "approve", flags: review }).ok).toBe(false);
    expect(checkDecision({ ...base, decision: "approve", flags: review, acknowledged: true }).ok).toBe(true);
    expect(checkDecision({ ...base, decision: "approve", flags: block, acknowledged: true }).ok).toBe(false);
    expect(checkDecision({ ...base, decision: "approve" }).ok).toBe(true);
  });

  it("confirm_district needs a declared district to confirm", () => {
    expect(checkDecision({ ...base, decision: "confirm_district", confirmedDistrict: null }).ok).toBe(false);
    expect(checkDecision({ ...base, decision: "confirm_district" }).ok).toBe(true);
  });

  it("offers only decisions the server accepts for each status", () => {
    expect(allowedDecisions("published")).toEqual(["unpublish"]);
    expect(allowedDecisions("approved")).not.toContain("approve");
    expect(allowedDecisions("submitted")).toContain("approve");
    expect(allowedDecisions("draft")).toEqual([]);
    expect(allowedDecisions("rejected")).toEqual([]);
  });

  it("builds a body that never carries a moderator id", () => {
    const body = requestBody({ decision: "approve", reasonText: " ok ", acknowledged: true, confirmedDistrict: null });
    expect(body).toEqual({ decision: "approve", reasonText: "ok", acknowledgeFlags: true });
    expect(requestBody({ decision: "reject", reasonText: "no", acknowledged: true, confirmedDistrict: "raipur" })).not.toHaveProperty("acknowledgeFlags");
    expect(JSON.stringify(body)).not.toMatch(/moderator/i);
  });
});
