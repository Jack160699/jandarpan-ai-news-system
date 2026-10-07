import { describe, expect, it } from "vitest";
import { canApprove, canContinueStep1, canSubmit, geoNote, mediaStatusLabel, stepForStatus, summarizeFlags } from "@/features/user-news/wizard-model";
import type { OwnSubmissionView } from "@/lib/user-news/service";

const view = (status: string, over: Partial<OwnSubmissionView> = {}): OwnSubmissionView =>
  ({ submission: { status, fact_flags: [], risk_flags: [], geo: {} } as never, media: [], moderation: [], readiness: { ready: true, problems: [] }, ...over }) as OwnSubmissionView;

describe("resuming a saved story", () => {
  it("returns to the right step for each status", () => {
    expect(stepForStatus("draft", false)).toBe(1);
    expect(stepForStatus("draft", true)).toBe(4);
    expect(stepForStatus("ai_generated", true)).toBe(4);
    expect(stepForStatus("user_approved", true)).toBe(5);
    for (const s of ["submitted", "under_review", "approved", "published", "rejected", "blocked", "withdrawn"]) expect(stepForStatus(s, true)).toBe(5);
  });
});

describe("step 1", () => {
  it("needs enough typed text, or a recording that will be transcribed", () => {
    expect(canContinueStep1({ text: "", hasVoice: false, transcript: "" })).toEqual({ ok: false, reason: "empty" });
    expect(canContinueStep1({ text: "हादसा हुआ", hasVoice: false, transcript: "" })).toEqual({ ok: false, reason: "too_short" });
    expect(canContinueStep1({ text: "आज सुबह रायपुर के शंकर नगर चौक पर दो बाइक की टक्कर हो गई।", hasVoice: false, transcript: "" })).toEqual({ ok: true, reason: null });
    expect(canContinueStep1({ text: "", hasVoice: true, transcript: "" })).toEqual({ ok: true, reason: null });
    expect(canContinueStep1({ text: "छोटा", hasVoice: true, transcript: "" }).ok).toBe(false); // some text but too little: the author must add more, not guess
    expect(canContinueStep1({ text: "", hasVoice: true, transcript: "आज सुबह रायपुर के शंकर नगर चौक पर दो बाइक की टक्कर हो गई।" }).ok).toBe(true);
  });
});

describe("flags are explained in plain language and split by who must act", () => {
  it("blocking facts and risks must be fixed by the author; review risks are for the moderator", () => {
    const s = summarizeFlags(
      {
        fact_flags: [
          { code: "unsupported_number", value: "7", severity: "block" },
          { code: "unsupported_name", value: "sharma", severity: "warn" },
        ] as never,
        risk_flags: [
          { code: "personal_data_exposure", severity: "block", evidence: "x" },
          { code: "unverifiable_claim", severity: "review", evidence: "x" },
          { code: "duplicate", severity: "info", evidence: "x" },
        ] as never,
      },
      "en"
    );
    expect(s.blockingFacts).toEqual(["A number you did not give: 7"]);
    expect(s.warnings).toEqual(["A name you did not give: sharma"]);
    expect(s.blockingRisk).toEqual(["Personal information"]);
    expect(s.reviewRisk).toEqual(["Unverified claim"]);
  });

  it("speaks Hindi", () => {
    const s = summarizeFlags({ fact_flags: [{ code: "unsupported_number", value: "7", severity: "block" }] as never, risk_flags: [] }, "hi");
    expect(s.blockingFacts[0]).toBe("संख्या जो आपने नहीं बताई: 7");
  });
});

describe("geography explanation", () => {
  it("never calls an unknown place 'found'", () => {
    expect(geoNote({ scope: "UNKNOWN" }).kind).toBe("unknown");
    expect(geoNote(undefined).kind).toBe("unknown");
    expect(geoNote({ scope: "DISTRICT_SPECIFIC", districtSlug: "raipur", declaredDistrictStatus: "confirmed_by_text" })).toEqual({ kind: "found", text: "raipur" });
    expect(geoNote({ scope: "STATEWIDE_CHHATTISGARH", declaredDistrictStatus: "unverified" }).kind).toBe("unverified_district");
  });
});

describe("what the buttons require", () => {
  it("approve needs a ready, unedited AI draft", () => {
    expect(canApprove(view("ai_generated"), false)).toBe(true);
    expect(canApprove(view("ai_generated"), true)).toBe(false); // unsaved edits
    expect(canApprove(view("ai_generated", { readiness: { ready: false, problems: ["x"] } }), false)).toBe(false);
    expect(canApprove(view("draft"), false)).toBe(false);
    expect(canApprove(view("user_approved"), false)).toBe(false);
  });

  it("submit needs the author's approval and no rejected media", () => {
    expect(canSubmit(view("user_approved"))).toEqual({ ok: true, reason: null });
    expect(canSubmit(view("ai_generated"))).toEqual({ ok: false, reason: "not_approved" });
    expect(canSubmit(view("user_approved", { media: [{ status: "rejected" }] as never }))).toEqual({ ok: false, reason: "media_problem" });
    expect(canSubmit(view("user_approved", { media: [{ status: "pending" }] as never })).ok).toBe(true); // media processing never blocks the text
  });

  it("maps media statuses to labels", () => {
    expect(mediaStatusLabel("ready")).toBe("ready");
    expect(mediaStatusLabel("rejected")).toBe("rejected");
    expect(mediaStatusLabel("failed")).toBe("rejected");
    expect(mediaStatusLabel("pending")).toBe("pendingCheck");
    expect(mediaStatusLabel("processing")).toBe("checking");
  });
});
