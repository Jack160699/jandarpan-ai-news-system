import { describe, expect, it, vi, beforeEach } from "vitest";

const getUser = vi.fn();
const maybeSingle = vi.fn();
const upsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createCookieServerClient: vi.fn(async () => ({
    auth: { getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle,
        }),
      }),
      upsert,
    }),
    storage: {
      from: () => ({
        upload: vi.fn(),
        getPublicUrl: () => ({ data: { publicUrl: "https://example/x" } }),
      }),
    },
  })),
}));

vi.mock("@/lib/supabase/env", () => ({
  isSupabaseConfigured: () => true,
}));

describe("reader profile API authorization", () => {
  beforeEach(() => {
    getUser.mockReset();
    maybeSingle.mockReset();
    upsert.mockReset();
  });

  it("rejects unauthenticated profile reads", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { GET } = await import("@/app/api/reader/profile/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated profile patches", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { PATCH } = await import("@/app/api/reader/profile/route");
    const res = await PATCH(
      new Request("https://news.example/api/reader/profile", {
        method: "PATCH",
        body: JSON.stringify({ displayName: "Hacker" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("allows authenticated self update", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "a@b.c" } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: null, error: null });
    upsert.mockResolvedValue({ error: null });
    const { PATCH } = await import("@/app/api/reader/profile/route");
    const res = await PATCH(
      new Request("https://news.example/api/reader/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: "Custom Reader" }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.profile.displayName).toBe("Custom Reader");
    expect(json.profile.displayNameCustomized).toBe(true);
  });
});
