"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";

export interface StoryEngagementData {
  views: number;
  likes: number;
  comments: number;
  user_liked: boolean;
}

export interface StoryCommentItem {
  id: string;
  story_id: string;
  user_id: string;
  user_name: string;
  comment_text: string;
  created_at: string;
}

// Global cache for instant display across components
const engagementCache: Record<string, StoryEngagementData> = {};

export function useStoryEngagement(storyIds: string[] = []) {
  const { user } = useReaderAccount();

  // Purge any legacy anonymous test IDs from client storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("jd_anon_uid");
      } catch {}
    }
  }, []);

  const [engagementMap, setEngagementMap] = useState<Record<string, StoryEngagementData>>(() => ({
    ...engagementCache,
  }));
  const fetchedIdsRef = useRef<Set<string>>(new Set());

  // Fetch authoritative engagement counts in batch
  const fetchEngagement = useCallback(
    async (ids: string[]) => {
      const toFetch = ids.filter((id) => id && id.trim());
      if (toFetch.length === 0) return;

      try {
        const res = await fetch(
          `/api/story/engagement?ids=${encodeURIComponent(toFetch.join(","))}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && data.data) {
          Object.assign(engagementCache, data.data);
          setEngagementMap((prev) => ({
            ...prev,
            ...data.data,
          }));
          toFetch.forEach((id) => fetchedIdsRef.current.add(id));
        }
      } catch (e) {
        console.warn("[useStoryEngagement] Failed to fetch engagement:", e);
      }
    },
    []
  );

  useEffect(() => {
    if (storyIds.length === 0) return;
    const missing = storyIds.filter((id) => !fetchedIdsRef.current.has(id));
    if (missing.length > 0) {
      void fetchEngagement(missing);
    }
  }, [storyIds, fetchEngagement]);

  // Record a genuine story play on TV (Authenticated User Only)
  const recordStoryPlay = useCallback(
    async (storyId: string, playCycleId: string) => {
      if (!storyId || !playCycleId || !user?.id) return;
      try {
        const res = await fetch("/api/story/engagement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "view",
            storyId,
            playCycleId,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && typeof data.views_count === "number") {
            setEngagementMap((prev) => {
              const current = prev[storyId] || { views: 0, likes: 0, comments: 0, user_liked: false };
              const updated = { ...current, views: data.views_count };
              engagementCache[storyId] = updated;
              return { ...prev, [storyId]: updated };
            });
          }
        }
      } catch (e) {
        console.warn("[useStoryEngagement] Error recording view:", e);
      }
    },
    [user?.id]
  );

  // Toggle story like (persisted to authoritative backend, authenticated only)
  const toggleLike = useCallback(
    async (storyId: string): Promise<boolean> => {
      if (!storyId || !user?.id) {
        // If not logged in, prompt user or return false
        return false;
      }

      try {
        const res = await fetch("/api/story/engagement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "like",
            storyId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            setEngagementMap((prev) => {
              const current = prev[storyId] || { views: 0, likes: 0, comments: 0, user_liked: false };
              const updated = {
                ...current,
                likes: data.likes_count,
                user_liked: data.liked,
              };
              engagementCache[storyId] = updated;
              return { ...prev, [storyId]: updated };
            });
            return true;
          }
        }
      } catch (e) {
        console.warn("[useStoryEngagement] Error toggling like:", e);
      }
      return false;
    },
    [user?.id]
  );

  // Post a comment (authenticated session only)
  const addComment = useCallback(
    async (storyId: string, commentText: string): Promise<StoryCommentItem | null> => {
      if (!storyId || !commentText.trim() || !user?.id) return null;

      try {
        const res = await fetch("/api/story/engagement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "comment",
            storyId,
            text: commentText.trim(),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.comment) {
            setEngagementMap((prev) => {
              const current = prev[storyId] || { views: 0, likes: 0, comments: 0, user_liked: false };
              const updated = {
                ...current,
                comments: data.comment.comments_count,
              };
              engagementCache[storyId] = updated;
              return { ...prev, [storyId]: updated };
            });
            return data.comment;
          }
        }
      } catch (e) {
        console.warn("[useStoryEngagement] Error posting comment:", e);
      }
      return null;
    },
    [user?.id]
  );

  // Fetch comments for a story
  const fetchComments = useCallback(async (storyId: string): Promise<StoryCommentItem[]> => {
    if (!storyId) return [];
    try {
      const res = await fetch(`/api/story/engagement/comments?storyId=${encodeURIComponent(storyId)}`);
      if (res.ok) {
        const data = await res.json();
        return data.comments || [];
      }
    } catch (e) {
      console.warn("[useStoryEngagement] Error fetching comments:", e);
    }
    return [];
  }, []);

  return {
    engagementMap,
    fetchEngagement,
    recordStoryPlay,
    toggleLike,
    addComment,
    fetchComments,
  };
}
