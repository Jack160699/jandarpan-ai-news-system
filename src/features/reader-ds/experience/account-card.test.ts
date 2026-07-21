import { describe, expect, it } from "vitest";
import { JD_DS_STRINGS, jdDsT } from "@/features/reader-ds/i18n/strings";
import { requiresMiddlewareSupabaseAuth } from "@/lib/auth/middleware-auth-policy";
import type { NextRequest } from "next/server";

function fakeRequest(cookieHeader = ""): NextRequest {
  return {
    cookies: {
      getAll: () =>
        cookieHeader
          ? cookieHeader.split(";").map((c) => {
              const [name, ...rest] = c.trim().split("=");
              return { name, value: rest.join("=") };
            })
          : [],
    },
  } as NextRequest;
}

describe("reader account card copy + navigation", () => {
  it("exposes Google sign-in and guest continue strings in both locales", () => {
    expect(jdDsT("hi", "accountCard.googleSignIn")).toBe("Google से साइन इन करें");
    expect(jdDsT("en", "accountCard.googleSignIn")).toContain("Google");
    expect(jdDsT("hi", "accountCard.continueGuest")).toBeTruthy();
    expect(jdDsT("hi", "accountCard.benefitDistrict")).toBeTruthy();
    expect(jdDsT("hi", "accountCard.benefitSaved")).toBeTruthy();
    expect(Object.keys(JD_DS_STRINGS.hi)).toEqual(
      expect.arrayContaining([
        "accountCard.googleSignIn",
        "accountCard.continueGuest",
        "accountCard.editProfile",
        "accountCard.syncOnDevice",
      ])
    );
  });

  it("keeps More (/archive) as the account hub route label", () => {
    expect(jdDsT("hi", "profile.title")).toBe("अधिक");
    expect(jdDsT("hi", "nav.more")).toBe("अधिक");
  });
});

describe("admin remains protected under middleware policy", () => {
  it("still requires supabase auth for admin desk paths", () => {
    expect(requiresMiddlewareSupabaseAuth("/admin", fakeRequest())).toBe(true);
    expect(requiresMiddlewareSupabaseAuth("/admin/team", fakeRequest())).toBe(true);
    expect(requiresMiddlewareSupabaseAuth("/archive", fakeRequest())).toBe(false);
  });

  it("refreshes session on reader OAuth callback", () => {
    expect(requiresMiddlewareSupabaseAuth("/auth/callback", fakeRequest())).toBe(
      true
    );
  });
});
