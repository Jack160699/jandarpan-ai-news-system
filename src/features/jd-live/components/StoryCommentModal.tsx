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

  useEffect(() => {
    if (!isOpen) {
      setCommentText("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
            <span className="jdl-comment-modal__tag">💬 {language === "hi" ? "टिप्पणियां" : "Comments"}</span>
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
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Comments List */}
        <div className="jdl-comment-modal__body">
          {comments.length === 0 ? (
            <div className="jdl-comment-modal__empty">
              <span>💬</span>
              <p>
                {language === "hi"
                  ? "इस खबर पर अभी कोई टिप्पणी नहीं है। अपने विचार साझा करें!"
                  : "No comments on this story yet. Be the first to share your thoughts!"}
              </p>
            </div>
          ) : (
            <div className="jdl-comment-modal__list">
              {comments.map((c) => (
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
