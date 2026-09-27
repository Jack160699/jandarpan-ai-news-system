"use client";

import React, { useState, useEffect } from "react";
import type { StoryCommentItem } from "../useStoryEngagement";

interface StoryCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  headline: string;
  language: "hi" | "en";
  comments: StoryCommentItem[];
  onAddComment: (text: string) => Promise<boolean>;
}

function CommentVectorIcon() {
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
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function StoryCommentModal({
  isOpen,
  onClose,
  storyId,
  headline,
  language,
  comments,
  onAddComment,
}: StoryCommentModalProps) {
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    if (!isOpen) {
      setCommentText("");
      setError(null);
      setVisibleCount(5);
    }
  }, [isOpen, storyId]);

  if (!isOpen) return null;

  const displayedComments = comments.slice(0, visibleCount);
  const remainingCount = comments.length - visibleCount;

  const handleLoadMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisibleCount((prev) => prev + 5);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const ok = await onAddComment(commentText.trim());
      if (ok) {
        setCommentText("");
      } else {
        setError(language === "hi" ? "टिप्पणी भेजने में विफल। पुनः प्रयास करें।" : "Failed to post comment. Try again.");
      }
    } catch {
      setError(language === "hi" ? "नेटवर्क त्रुटि।" : "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="jdl-comment-modal-backdrop"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={language === "hi" ? "टिप्पणियां" : "Comments"}
    >
      <div
        className="jdl-comment-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="jdl-comment-modal__header">
          <div className="jdl-comment-modal__title-wrap">
            <span className="jdl-comment-modal__tag">
              <CommentVectorIcon />
              <span>{language === "hi" ? "टिप्पणियां" : "Comments"}</span>
              <span className="jdl-comment-modal__badge">({comments.length})</span>
            </span>
            <h3 className="jdl-comment-modal__headline" title={headline}>
              {headline}
            </h3>
          </div>
          <button
            type="button"
            className="jdl-comment-modal__close-btn"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label={language === "hi" ? "बंद करें" : "Close"}
            title={language === "hi" ? "बंद करें" : "Close"}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Comments List (5 initially + Load More) */}
        <div className="jdl-comment-modal__body">
          {comments.length === 0 ? (
            <div className="jdl-comment-modal__empty">
              <div className="jdl-comment-modal__empty-icon" aria-hidden="true">
                <CommentVectorIcon />
              </div>
              <p>
                {language === "hi"
                  ? "इस खबर पर अभी कोई टिप्पणी नहीं है। अपने विचार साझा करें!"
                  : "No comments on this story yet. Be the first to share your thoughts!"}
              </p>
            </div>
          ) : (
            <div className="jdl-comment-modal__list">
              {displayedComments.map((c) => (
                <div key={c.id} className="jdl-comment-item">
                  <div className="jdl-comment-item__header">
                    <span className="jdl-comment-item__author">{c.user_name}</span>
                    <span className="jdl-comment-item__time">
                      {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="jdl-comment-item__text">{c.comment_text}</p>
                </div>
              ))}

              {/* Requirement #5: Load more / और देखें when additional comments exist */}
              {remainingCount > 0 && (
                <div className="jdl-comment-modal__more-wrap">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    className="jdl-comment-modal__load-more-btn"
                  >
                    <span>
                      {language === "hi"
                        ? `और देखें (${remainingCount} और टिप्पणियां)`
                        : `Load more (${remainingCount} more)`}
                    </span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Post Form */}
        <form className="jdl-comment-modal__form" onSubmit={handleSubmit}>
          {error && <div className="jdl-comment-modal__error">{error}</div>}
          <div className="jdl-comment-modal__input-row">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={language === "hi" ? "अपनी टिप्पणी लिखें..." : "Add a comment..."}
              maxLength={1000}
              disabled={submitting}
              className="jdl-comment-modal__input"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submitting}
              className="jdl-comment-modal__submit-btn"
            >
              {submitting ? "..." : language === "hi" ? "भेजें" : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
