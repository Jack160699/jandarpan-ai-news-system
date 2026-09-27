import { NextRequest, NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { checkPublicApiRateLimit } from "@/lib/security/public-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Story Engagement API
 *
 * GET: Fetch batch engagement counts for stories (views, likes, comments, user_liked)
 * POST: Record views (idempotent play cycle), likes (toggle), or comments
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    if (!idsParam) {
      return NextResponse.json({ ok: false, error: "Missing ids" }, { status: 400 });
    }

    const storyIds = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (storyIds.length === 0) {
      return NextResponse.json({ ok: true, data: {} });
    }

    const userId = searchParams.get("userId") || null;
    const supabase = createAdminServerClient();

    const { data, error } = await (supabase as any).rpc("get_stories_engagement", {
      p_story_ids: storyIds,
      p_user_id: userId,
    });

    if (error) {
      console.error("[Engagement API] Error fetching engagement:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: data || {},
    });
  } catch (err: unknown) {
    console.error("[Engagement API] Unexpected GET error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rate = await checkPublicApiRateLimit(request, "story-engagement", 120, 60);
    if (!rate.allowed) return rate.response;

    const body = await request.json();
    const { action, storyId } = body;

    if (!storyId || typeof storyId !== "string") {
      return NextResponse.json({ ok: false, error: "Missing storyId" }, { status: 400 });
    }

    const supabase = createAdminServerClient();

    // 1. Record Story Play (View)
    if (action === "view") {
      const { playCycleId, userId } = body;
      if (!playCycleId || typeof playCycleId !== "string") {
        return NextResponse.json(
          { ok: false, error: "Missing playCycleId" },
          { status: 400 }
        );
      }

      const { data, error } = await (supabase as any).rpc("record_story_play", {
        p_story_id: storyId,
        p_play_cycle_id: playCycleId,
        p_user_id: userId || null,
      });

      if (error) {
        console.error("[Engagement API] Error recording view:", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        views_count: Number(data || 0),
      });
    }

    // 2. Toggle Like
    if (action === "like") {
      const { userId } = body;
      if (!userId || typeof userId !== "string") {
        return NextResponse.json(
          { ok: false, error: "Missing userId for like" },
          { status: 400 }
        );
      }

      const { data, error } = await (supabase as any).rpc("toggle_story_like", {
        p_story_id: storyId,
        p_user_id: userId,
      });

      if (error) {
        console.error("[Engagement API] Error toggling like:", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        ...data,
      });
    }

    // 3. Add Comment
    if (action === "comment") {
      const { userId, userName, text } = body;
      if (!text || typeof text !== "string" || !text.trim()) {
        return NextResponse.json(
          { ok: false, error: "Comment text cannot be empty" },
          { status: 400 }
        );
      }

      const cleanText = text.trim().slice(0, 2000);
      const cleanUser = (userName || "Reader").trim().slice(0, 80);
      const cleanUserId = (userId || "anonymous").trim();

      const { data, error } = await (supabase as any).rpc("add_story_comment", {
        p_story_id: storyId,
        p_user_id: cleanUserId,
        p_user_name: cleanUser,
        p_comment_text: cleanText,
      });

      if (error) {
        console.error("[Engagement API] Error adding comment:", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        comment: data,
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[Engagement API] Unexpected POST error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
