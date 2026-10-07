import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { describePostNewsCard } from "@/features/user-news/post-news-card";
import type { PostNewsStatus } from "@/lib/user-news/service";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: unknown } & Record<string, unknown>) => createElement("a", { href, ...rest }, children as never) }));

const base: PostNewsStatus = {
  authenticated: true,
  allowed: false,
  reason: null,
  message: null,
  verification: { status: "unverified", provider: null },
  verificationMode: "unavailable",
  features: { voice: true, video: true, monetizationActive: false },
  limits: { aiDraftsPerDay: 10, submissionsPerDay: 5, maxImages: 6, maxVideoMb: 100, maxVoiceSeconds: 60 },
};
const st = (over: Partial<PostNewsStatus>): PostNewsStatus => ({ ...base, ...over });

describe("describePostNewsCard: the card always tells the truth", () => {
  it("signed out: no actions, asks to sign in", () => {
    const m = describePostNewsCard({ loading: false, isLoggedIn: false, status: null, locale: "en" });
    expect(m).toMatchObject({ state: "signed_out", primary: null, secondary: null, message: "Sign in to post news" });
  });

  it("verified: a Post News button, a Verified badge and My News", () => {
    const m = describePostNewsCard({ loading: false, isLoggedIn: true, status: st({ allowed: true, verification: { status: "verified", provider: "acme" } }), locale: "en" });
    expect(m).toMatchObject({ state: "open", badge: { label: "Verified", tone: "verified" }, primary: { href: "/profile/post-news" }, secondary: { href: "/profile/my-news" } });
  });

  it("no verification service configured: LOCKED with the exact compliance wording, and no button that cannot work", () => {
    const m = describePostNewsCard({ loading: false, isLoggedIn: true, status: st({ reason: "verification_unavailable" }), locale: "en" });
    expect(m).toMatchObject({ state: "locked", primary: null, message: "Identity verification unavailable until verification service is configured.", badge: { tone: "neutral" } });
  });

  it("a verification service exists but the user is not verified: asks them to verify, never shows Verified", () => {
    const m = describePostNewsCard({ loading: false, isLoggedIn: true, status: st({ reason: "not_verified", verificationMode: "provider" }), locale: "en" });
    expect(m).toMatchObject({ state: "locked", message: "Verify your identity to publish news", primary: null });
    expect(m.badge?.tone).not.toBe("verified");
  });

  it("the feature switched off is reported, not hidden", () => {
    const m = describePostNewsCard({ loading: false, isLoggedIn: true, status: st({ reason: "feature_disabled", message: "Posting news is currently switched off." }), locale: "en" });
    expect(m).toMatchObject({ state: "locked", message: "Posting news is currently switched off." });
  });

  it("is available in Hindi", () => {
    const m = describePostNewsCard({ loading: false, isLoggedIn: true, status: st({ allowed: true }), locale: "hi" });
    expect(m.title).toBe("समाचार पोस्ट करें");
    expect(m.primary?.label).toBe("खबर भेजना शुरू करें");
  });
});

describe("PostNewsCard renders", () => {
  it("each state server-side with the right markers", async () => {
    const { PostNewsCard } = await import("@/features/user-news/PostNewsCard");
    const open = renderToStaticMarkup(createElement(PostNewsCard, { locale: "en", isLoggedIn: true, initialStatus: st({ allowed: true }) }));
    expect(open).toContain('data-state="open"');
    expect(open).toContain("POST NEWS");
    expect(open).toContain("Verified");
    expect(open).toContain('href="/profile/post-news"');

    const locked = renderToStaticMarkup(createElement(PostNewsCard, { locale: "en", isLoggedIn: true, initialStatus: st({ reason: "verification_unavailable" }) }));
    expect(locked).toContain('data-state="locked"');
    expect(locked).toContain("Identity verification unavailable until verification service is configured.");
    expect(locked).not.toContain('href="/profile/post-news"');
    expect(locked).toContain('href="/profile/my-news"');
  });
});
