"use client";

import React, { useState } from "react";
import type { BroadcastSegment } from "../types";
import type { StoryEngagementData, StoryCommentItem } from "../useStoryEngagement";
import { StoryCommentModal } from "./StoryCommentModal";

interface CardEngagementRowProps {
  story: BroadcastSegment;
  headline: string;
  language: "hi" | "en";
  engagement?: StoryEngagementData;
  onOpenArticle: (e: React.MouseEvent, story: BroadcastSegment) => void;
  onToggleLike: (storyId: string) => Promise<boolean>;
  onFetchComments: (storyId: string) => Promise<StoryCommentItem[]>;
  onAddComment: (storyId: string, text: string) => Promise<StoryCommentItem | null>;
}

export function formatEngagementCount(num: number): string {
  if (!num || num <= 0) return "0";
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 10000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toLocaleString();
}

/**
 * Modern Clean Vector Icons (No Unicode Emojis).
 * Unified design family: 16x16 optical size, ~1.85px stroke, crisp vectors.
 */

export function HeartIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="#e11d48"
        stroke="#e11d48"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ display: "block" }}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    );
  }
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function CommentIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function ViewsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function WhatsAppIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path
        fill="#25D366"
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2z"
      />
      <path
        fill="#FFFFFF"
        d="M17.52 14.37c-.26-.13-1.54-.76-1.78-.85-.24-.09-.41-.13-.58.13-.17.26-.67.85-.82 1.02-.15.17-.3.19-.56.06-.26-.13-1.1-.41-2.09-1.29-.77-.69-1.29-1.54-1.44-1.8-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45s-.58-1.4-1.2-1.92c-.2-.17-.4-.15-.55-.15h-.47c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.03s.87 2.36 1 2.53c.13.17 1.72 2.63 4.17 3.69.58.25 1.04.4 1.39.51.58.19 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.23-.16-.48-.28z"
      />
    </svg>
  );
}

export function BookIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="M6 6h10" />
      <path d="M6 10h10" />
    </svg>
  );
}

export function CardEngagementRow({
  story,
  headline,
  language,
  engagement = { views: 0, likes: 0, comments: 0, user_liked: false },
  onOpenArticle,
  onToggleLike,
  onFetchComments,
  onAddComment,
}: CardEngagementRowProps) {
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentsList, setCommentsList] = useState<StoryCommentItem[]>([]);
  const [liking, setLiking] = useState(false);

  // 1. Like Handler (Authoritative backend count + interaction)
  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (liking) return;
    setLiking(true);
    try {
      await onToggleLike(story.id);
    } finally {
      setLiking(false);
    }
  };

  // 2. Comment Handler (Authoritative backend count + modal)
  const handleCommentClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCommentModalOpen(true);
    const list = await onFetchComments(story.id);
    setCommentsList(list);
  };

  const handlePostComment = async (text: string): Promise<boolean> => {
    const newComment = await onAddComment(story.id, text);
    if (newComment) {
      setCommentsList((prev) => [newComment, ...prev]);
      return true;
    }
    return false;
  };

  // 3. WhatsApp Share (Action only - NO COUNT, NO "WhatsApp" text)
  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const origin = typeof window !== "undefined" ? window.location.origin : "https://www.jandarpan.news";
    const storyUrl = story.slug ? `${origin}/story/${story.slug}` : origin;
    const text = encodeURIComponent(`📰 ${headline}\n\nपढ़ें जन दर्पण पर: ${storyUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="jdl-card-engagement-row" onClick={(e) => e.stopPropagation()}>
        {/* EXACT 5 ACTIONS IN EXACT ORDER:
            1. ❤️ Like + count
            2. 💬 Comment + count
            3. 👁 Views + count
            4. WhatsApp icon (official logo, NO text, NO count)
            5. 📖 पढ़ें (highlighted primary CTA)
        */}

        {/* 1. Like Button (+ count) */}
        <button
          type="button"
          className={`jdl-engagement-item jdl-engagement-btn ${engagement.user_liked ? "jdl-engagement-btn--liked" : ""}`}
          onClick={handleLikeClick}
          disabled={liking}
          aria-label={engagement.user_liked ? (language === "hi" ? "पसंद हटाएं" : "Unlike story") : (language === "hi" ? "पसंद करें" : "Like story")}
          title={engagement.user_liked ? (language === "hi" ? "पसंद हटाया" : "Unlike") : (language === "hi" ? "पसंद करें" : "Like")}
        >
          <span className="jdl-engagement-icon" aria-hidden="true">
            <HeartIcon filled={engagement.user_liked} />
          </span>
          <span className="jdl-engagement-count">{formatEngagementCount(engagement.likes)}</span>
        </button>

        {/* 2. Comment Button (+ count) */}
        <button
          type="button"
          className="jdl-engagement-item jdl-engagement-btn"
          onClick={handleCommentClick}
          aria-label={language === "hi" ? "टिप्पणियां देखें या लिखें" : "View or add comments"}
          title={language === "hi" ? "टिप्पणियां देखें / लिखें" : "Comments"}
        >
          <span className="jdl-engagement-icon" aria-hidden="true">
            <CommentIcon />
          </span>
          <span className="jdl-engagement-count">{formatEngagementCount(engagement.comments)}</span>
        </button>

        {/* 3. Views Pill (+ count) */}
        <div
          className="jdl-engagement-item jdl-engagement-item--views"
          title={`${engagement.views.toLocaleString()} ${language === "hi" ? "बार देखा गया" : "views"}`}
          aria-label={`${engagement.views.toLocaleString()} views`}
        >
          <span className="jdl-engagement-icon" aria-hidden="true">
            <ViewsIcon />
          </span>
          <span className="jdl-engagement-count">{formatEngagementCount(engagement.views)}</span>
        </div>

        {/* 4. WhatsApp Icon (Action only - NO text, NO count) */}
        <button
          type="button"
          className="jdl-engagement-item jdl-engagement-btn jdl-engagement-btn--whatsapp"
          onClick={handleWhatsAppClick}
          aria-label={language === "hi" ? "WhatsApp पर शेयर करें" : "Share on WhatsApp"}
          title={language === "hi" ? "WhatsApp पर शेयर करें" : "Share on WhatsApp"}
        >
          <span className="jdl-engagement-icon jdl-engagement-icon--whatsapp" aria-hidden="true">
            <WhatsAppIcon />
          </span>
        </button>

        {/* 5. Primary Action: पढ़ें (Visually highlighted, opens reader) */}
        <button
          type="button"
          onClick={(e) => onOpenArticle(e, story)}
          className="jdl-engagement-item jdl-queue-card__read-btn"
          aria-label={`${headline} — ${language === "hi" ? "पढ़ें" : "Read"}`}
        >
          <BookIcon />
          <span>{language === "hi" ? "पढ़ें" : "Read"}</span>
        </button>
      </div>

      {/* In-place Comment Drawer / Modal */}
      <StoryCommentModal
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        storyId={story.id}
        headline={headline}
        language={language}
        comments={commentsList}
        onAddComment={handlePostComment}
      />
    </>
  );
}
