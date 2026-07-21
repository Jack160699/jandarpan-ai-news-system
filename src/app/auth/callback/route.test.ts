import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/auth/callback/route";

vi.mock("@/lib/supabase/server", () => ({
  createCookieServerClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: vi.fn(async (code: string) => {
        if (code === "bad") {
          return { error: { message: "invalid" } };
        }
        return { error: null };
      }),
    },
  })),
}));

vi.mock("@/lib/supabase/env", () => ({
  isSupabaseConfigured: () => true,
}));

describe("OAuth callback route", () => {
  it("redirects to safe next on success", async () => {
    const res = await GET(
      new Request("https://news.example/auth/callback?code=ok&next=%2Farchive%2Fsaved")
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://news.example/archive/saved");
  });

  it("rejects invalid return URL and falls back", async () => {
    const res = await GET(
      new Request(
        "https://news.example/auth/callback?code=ok&next=https%3A%2F%2Fevil.example"
      )
    );
    expect(res.headers.get("location")).toBe("https://news.example/archive");
  });

  it("handles exchange failure", async () => {
    const res = await GET(
      new Request("https://news.example/auth/callback?code=bad")
    );
    expect(res.headers.get("location")).toContain("/login?authError=exchange_failed");
  });

  it("handles cancel/denied OAuth error", async () => {
    const res = await GET(
      new Request(
        "https://news.example/auth/callback?error=access_denied&error_description=denied"
      )
    );
    expect(res.headers.get("location")).toContain("/login?authError=denied");
  });

  it("handles missing code", async () => {
    const res = await GET(new Request("https://news.example/auth/callback"));
    expect(res.headers.get("location")).toContain("/login?authError=missing_code");
  });
});
