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

function formatEngagementCount(num: number): string {
  if (!num || num <= 0) return "0";
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 10000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toLocaleString();
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
        {/* EXACT 5 SECTIONS: ❤️ Like -> 💬 Comment -> 👁 Views -> 🟢 WhatsApp icon -> 📖 पढ़ें */}

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
            {engagement.user_liked ? "❤️" : "🤍"}
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
          <span className="jdl-engagement-icon" aria-hidden="true">💬</span>
          <span className="jdl-engagement-count">{formatEngagementCount(engagement.comments)}</span>
        </button>

        {/* 3. Views Pill (+ count) */}
        <div
          className="jdl-engagement-item jdl-engagement-item--views"
          title={`${engagement.views.toLocaleString()} ${language === "hi" ? "बार देखा गया" : "views"}`}
          aria-label={`${engagement.views.toLocaleString()} views`}
        >
          <span className="jdl-engagement-icon" aria-hidden="true">👁</span>
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
          <span className="jdl-engagement-icon jdl-engagement-icon--whatsapp" aria-hidden="true">🟢</span>
        </button>

        {/* 5. Primary Action: 📖 पढ़ें (Visually highlighted, opens reader) */}
        <button
          type="button"
          onClick={(e) => onOpenArticle(e, story)}
          className="jdl-queue-card__read-btn"
          aria-label={`${headline} — ${language === "hi" ? "पढ़ें" : "Read"}`}
        >
          <span>{language === "hi" ? "📖 पढ़ें" : "📖 Read"}</span>
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
