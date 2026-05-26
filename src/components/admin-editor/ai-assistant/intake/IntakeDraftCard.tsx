"use client";

import { ArrowDownToLine, ImageIcon, Loader2, X } from "lucide-react";
import type { AiStoryDraft } from "../types";

type IntakeDraftCardProps = {
  draft: AiStoryDraft;
  onApply: () => void;
  onDismiss: () => void;
  onGenerateCover: () => void;
  isCoverRunning?: boolean;
};

export function IntakeDraftCard({
  draft,
  onApply,
  onDismiss,
  onGenerateCover,
  isCoverRunning,
}: IntakeDraftCardProps) {
  return (
    <article className="jd-ai-intake-draft">
      <header className="jd-ai-intake-draft__head">
        <strong>Story pack</strong>
        <button
          type="button"
          className="jd-ai-intake-draft__dismiss"
          onClick={onDismiss}
          aria-label="Dismiss draft"
        >
          <X size={14} />
        </button>
      </header>
      <dl className="jd-ai-intake-draft__fields">
        <div>
          <dt>Headline</dt>
          <dd>{draft.headline}</dd>
        </div>
        <div>
          <dt>Summary</dt>
          <dd>{draft.summary}</dd>
        </div>
        <div>
          <dt>SEO title</dt>
          <dd>{draft.seoTitle}</dd>
        </div>
        <div>
          <dt>Meta description</dt>
          <dd>{draft.metaDescription}</dd>
        </div>
        {draft.tags.length > 0 ? (
          <div>
            <dt>Tags</dt>
            <dd className="jd-ai-intake-draft__tags">
              {draft.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </dd>
          </div>
        ) : null}
        {draft.socialCaptions.length > 0 ? (
          <div>
            <dt>Social</dt>
            <dd className="jd-ai-intake-draft__social">
              {draft.socialCaptions.map((c) => (
                <p key={c.platform}>
                  <em>{c.platform}</em> {c.text}
                </p>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="jd-ai-intake-draft__body-preview">
        {draft.body.length > 200 ? `${draft.body.slice(0, 200)}…` : draft.body}
      </p>
      {draft.coverImageUrl ? (
        <p className="jd-ai-intake-form__hint">Cover: {draft.coverImageUrl}</p>
      ) : null}
      <div className="jd-ai-intake-draft__actions">
        <button
          type="button"
          className="jd-ai-intake-draft__apply anr-btn anr-btn--primary"
          onClick={onApply}
        >
          <ArrowDownToLine size={14} />
          Insert into editor
        </button>
        <button
          type="button"
          className="jd-ai-intake-draft__cover anr-btn anr-btn--ghost"
          disabled={isCoverRunning}
          onClick={onGenerateCover}
        >
          {isCoverRunning ? (
            <>
              <Loader2 size={14} className="spin" /> Cover…
            </>
          ) : (
            <>
              <ImageIcon size={14} />
              {draft.coverImageUrl ? "Regenerate cover" : "Generate cover"}
            </>
          )}
        </button>
      </div>
    </article>
  );
}
