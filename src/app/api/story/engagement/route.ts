import { NextRequest, NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { createCookieServerClient } from "@/lib/supabase/server";
import { checkPublicApiRateLimit } from "@/lib/security/public-rate-limit";
import type { User } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authoritative Server-Side User Session Resolver
 *
 * Verifies authenticated identity from:
 * 1. Supabase Auth cookie session (App Router cookieStore)
 * 2. Authorization: Bearer <token> (API / programmatic callers)
 *
 * Never trusts client-supplied user IDs in request bodies or query params.
 */
async function getAuthenticatedUser(request: NextRequest): Promise<User | null> {
  // 1. Attempt session resolution via authenticated cookies
  try {
    const cookieClient = await createCookieServerClient();
    const {
      data: { user },
      error,
    } = await cookieClient.auth.getUser();
    if (!error && user) {
      return user;
    }
  } catch {
    // Cookie read failed, proceed to header fallback
  }

  // 2. Attempt token resolution via Authorization header Bearer token
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        const adminClient = createAdminServerClient();
        const {
          data: { user },
          error,
        } = await adminClient.auth.getUser(token);
        if (!error && user) {
          return user;
        }
      } catch {
        // Bearer resolution failed
      }
    }
  }

  return null;
}

/**
 * Story Engagement API
 *
 * GET: Fetch batch engagement counts for stories (views, likes, comments, user_liked)
 * POST: Record views (authenticated), likes (authenticated toggle), comments (authenticated)
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

    // Determine user identity strictly from verified session (ignore query params)
    const user = await getAuthenticatedUser(request);
    const verifiedUserId = user?.id || null;

    const supabase = createAdminServerClient();
    const { data, error } = await (supabase as any).rpc("get_stories_engagement", {
      p_story_ids: storyIds,
      p_user_id: verifiedUserId,
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

    // Strict Server-Side Authentication Enforcement (Objectives B, C; Requirements 14, 15, 36)
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized: Active authenticated session required for engagement." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, storyId } = body;

    if (!storyId || typeof storyId !== "string" || !storyId.trim()) {
      return NextResponse.json({ ok: false, error: "Missing or invalid storyId" }, { status: 400 });
    }

    const cleanStoryId = storyId.trim();
    const supabase = createAdminServerClient();

    // 1. Record Story Play (View) — Authenticated User Only
    if (action === "view") {
      const { playCycleId } = body;
      if (!playCycleId || typeof playCycleId !== "string" || !playCycleId.trim()) {
        return NextResponse.json(
          { ok: false, error: "Missing playCycleId" },
          { status: 400 }
        );
      }

      const { data, error } = await (supabase as any).rpc("record_story_play", {
        p_story_id: cleanStoryId,
        p_play_cycle_id: playCycleId.trim(),
        p_user_id: user.id, // Strictly derived from verified session
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

    // 2. Toggle Like — Authenticated User Only
    if (action === "like") {
      const { data, error } = await (supabase as any).rpc("toggle_story_like", {
        p_story_id: cleanStoryId,
        p_user_id: user.id, // Strictly derived from verified session; ignores any body.userId
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

    // 3. Add Comment — Authenticated User Only
    if (action === "comment") {
      const { text } = body;
      if (!text || typeof text !== "string" || !text.trim()) {
        return NextResponse.json(
          { ok: false, error: "Comment text cannot be empty" },
          { status: 400 }
        );
      }

      const cleanText = text.trim().slice(0, 2000);
      const verifiedUserName = (
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Reader"
      ).trim().slice(0, 80);

      const { data, error } = await (supabase as any).rpc("add_story_comment", {
        p_story_id: cleanStoryId,
        p_user_id: user.id, // Strictly derived from verified session; ignores any body.userId
        p_user_name: verifiedUserName, // Strictly derived from verified account; no "Guest Reader"
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
