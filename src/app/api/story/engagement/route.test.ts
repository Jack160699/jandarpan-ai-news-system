import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "./route";

const mockRpc = vi.fn();
const mockAdminGetUser = vi.fn();
const mockCookieGetUser = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminServerClient: () => ({
    rpc: mockRpc,
    auth: {
      getUser: mockAdminGetUser,
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createCookieServerClient: async () => ({
    auth: {
      getUser: mockCookieGetUser,
    },
  }),
}));

vi.mock("@/lib/security/public-rate-limit", () => ({
  checkPublicApiRateLimit: async () => ({ allowed: true }),
}));

describe("Story Engagement API Security & Correctness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication Requirements (Objectives B, C; Req #14, #15, #36)", () => {
    it("rejects unauthenticated like mutations with 401", async () => {
      mockCookieGetUser.mockResolvedValue({ data: { user: null }, error: null });
      mockAdminGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const req = new NextRequest("http://localhost/api/story/engagement", {
        method: "POST",
        body: JSON.stringify({
          action: "like",
          storyId: "test-story-id",
          userId: "attacker_forged_id",
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.ok).toBe(false);
      expect(json.error).toContain("Unauthorized");
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated comment mutations with 401", async () => {
      mockCookieGetUser.mockResolvedValue({ data: { user: null }, error: null });
      mockAdminGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const req = new NextRequest("http://localhost/api/story/engagement", {
        method: "POST",
        body: JSON.stringify({
          action: "comment",
          storyId: "test-story-id",
          userId: "anon_attacker",
          userName: "Guest Reader",
          text: "Fake comment",
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.ok).toBe(false);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated view mutations with 401", async () => {
      mockCookieGetUser.mockResolvedValue({ data: { user: null }, error: null });
      mockAdminGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const req = new NextRequest("http://localhost/api/story/engagement", {
        method: "POST",
        body: JSON.stringify({
          action: "view",
          storyId: "test-story-id",
          playCycleId: "bot_cycle_1",
          userId: "anon_bot",
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.ok).toBe(false);
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe("Forged Identity Immunity (Req #15)", () => {
    it("derives user_id strictly from verified session and ignores forged body.userId", async () => {
      const realUser = {
        id: "real-authenticated-uuid",
        email: "verified@example.com",
        user_metadata: { full_name: "Verified User" },
      };
      mockCookieGetUser.mockResolvedValue({ data: { user: realUser }, error: null });
      mockRpc.mockResolvedValue({ data: { liked: true, likes_count: 5 }, error: null });

      const req = new NextRequest("http://localhost/api/story/engagement", {
        method: "POST",
        body: JSON.stringify({
          action: "like",
          storyId: "test-story-id",
          userId: "victim_user_id_forged", // Attacker attempts to like on behalf of someone else
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("toggle_story_like", {
        p_story_id: "test-story-id",
        p_user_id: "real-authenticated-uuid", // Must use real session ID, never forged ID!
      });
    });

    it("uses verified name from user session and eliminates 'Guest Reader'", async () => {
      const realUser = {
        id: "real-authenticated-uuid",
        email: "verified@example.com",
        user_metadata: { full_name: "Verified Real Name" },
      };
      mockCookieGetUser.mockResolvedValue({ data: { user: realUser }, error: null });
      mockRpc.mockResolvedValue({
        data: { id: "cmt-1", comment_text: "Great piece", user_name: "Verified Real Name", comments_count: 1 },
        error: null,
      });

      const req = new NextRequest("http://localhost/api/story/engagement", {
        method: "POST",
        body: JSON.stringify({
          action: "comment",
          storyId: "test-story-id",
          userId: "attacker_id",
          userName: "Guest Reader", // Forged/legacy name in body
          text: "Great piece",
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("add_story_comment", {
        p_story_id: "test-story-id",
        p_user_id: "real-authenticated-uuid",
        p_user_name: "Verified Real Name", // Uses real session name, completely ignoring "Guest Reader"
        p_comment_text: "Great piece",
      });
    });
  });

  describe("GET Engagement Query (Req #22)", () => {
    it("ignores query param userId and only checks session auth", async () => {
      mockCookieGetUser.mockResolvedValue({ data: { user: null }, error: null });
      mockAdminGetUser.mockResolvedValue({ data: { user: null }, error: null });
      mockRpc.mockResolvedValue({
        data: { "story-1": { views: 10, likes: 2, comments: 1, user_liked: false } },
        error: null,
      });

      const req = new NextRequest("http://localhost/api/story/engagement?ids=story-1&userId=forged-query-user");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("get_stories_engagement", {
        p_story_ids: ["story-1"],
        p_user_id: null, // Ignored forged query param since not authenticated
      });
    });
  });
});
