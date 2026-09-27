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
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path
        fill="#25D366"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
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
