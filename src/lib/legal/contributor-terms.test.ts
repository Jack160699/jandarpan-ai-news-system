import { describe, expect, it } from "vitest";
import { POLICY_DOCUMENTS, getPolicy } from "@/lib/legal/policies";
import { LEGAL_SITEMAP_PATHS } from "@/lib/legal/foundation-policies";
import { isReaderAuthGateExempt } from "@/lib/auth/middleware-auth-policy";

describe("contributor terms stay true to the product", () => {
  const doc = POLICY_DOCUMENTS["contributor-terms"];
  const text = doc.sections.map((s) => `${s.heading}\n${s.body}`).join("\n");

  it("exists, is reachable, and is listed for search engines", () => {
    expect(getPolicy("contributor-terms")).toBe(doc);
    expect(doc.path).toBe("/contributor-terms");
    expect((LEGAL_SITEMAP_PATHS as readonly string[]).includes("/contributor-terms")).toBe(true);
    expect(isReaderAuthGateExempt("/contributor-terms")).toBe(true);
  });

  it("never promises earnings or Aadhaar storage", () => {
    expect(text).toMatch(/Revenue sharing with contributors is not active/);
    expect(text).toMatch(/does not store any of them/);
    expect(text).not.toMatch(/you will earn|guaranteed|per view|paid for/i);
  });

  it("covers the promises the code keeps: author approval, editorial review, takedown, no invented facts", () => {
    expect(text).toMatch(/approved it yourself/);
    expect(text).toMatch(/reviewed by an editor before it is published/);
    expect(text).toMatch(/taken down/);
    expect(text).toMatch(/must not add names, numbers, quotes, dates or places/);
  });

  it("has Hindi and English titles and a revision date", () => {
    expect(doc.titleHi.length).toBeGreaterThan(3);
    expect(doc.titleEn.length).toBeGreaterThan(3);
    expect(doc.updated).toBe("October 2026");
  });
});
