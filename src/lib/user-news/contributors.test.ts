import { describe, expect, it } from "vitest";
import { buildContributors } from "@/lib/user-news/contributors";

const now = new Date("2026-10-07T00:00:00.000Z");
const sub = (author_id: string, status: string, created_at = "2026-10-01T00:00:00.000Z", published_at: string | null = null) => ({ author_id, status, created_at, published_at });

describe("buildContributors", () => {
  const rows = buildContributors({
    now,
    submissions: [sub("a", "published", "2026-10-01T00:00:00.000Z", "2026-10-02T00:00:00.000Z"), sub("a", "published", "2026-10-03T00:00:00.000Z", "2026-10-04T00:00:00.000Z"), sub("a", "rejected"), sub("b", "submitted"), sub("b", "blocked"), sub("c", "draft")],
    profiles: [{ user_id: "a", display_name: " Asha " }, { user_id: "b", display_name: null }],
    verifications: [
      { user_id: "a", status: "verified", provider: "acme", verified_at: "2026-09-01T00:00:00.000Z", expires_at: null },
      { user_id: "b", status: "verified", provider: "acme", verified_at: "2026-01-01T00:00:00.000Z", expires_at: "2026-06-01T00:00:00.000Z" },
    ],
  });
  const by = Object.fromEntries(rows.map((r) => [r.userId, r]));

  it("counts outcomes per contributor and orders by published stories", () => {
    expect(rows.map((r) => r.userId)).toEqual(["a", "b", "c"]);
    expect(by.a).toMatchObject({ submissions: 3, published: 2, rejected: 1, inReview: 0, displayName: "Asha", lastActivityAt: "2026-10-04T00:00:00.000Z" });
    expect(by.b).toMatchObject({ submissions: 2, published: 0, rejected: 1, inReview: 1, displayName: null });
  });

  it("reports the CURRENT verification state: expired is not verified, none is unverified", () => {
    expect(by.a!.verification).toBe("verified");
    expect(by.b!.verification).not.toBe("verified");
    expect(by.c!.verification).not.toBe("verified");
  });

  it("exposes no identity data or emails", () => {
    const text = JSON.stringify(rows);
    expect(text).not.toMatch(/@|reference|aadhaar|phone|otp/i);
    expect(Object.keys(rows[0]!).sort()).toEqual(["displayName", "inReview", "lastActivityAt", "published", "rejected", "submissions", "userId", "verification", "verificationProvider"]);
  });
});
