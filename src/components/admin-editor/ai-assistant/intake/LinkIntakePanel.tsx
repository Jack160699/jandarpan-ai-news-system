"use client";

import { Link2, Loader2, Sparkles } from "lucide-react";

type LinkIntakePanelProps = {
  url: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

export function LinkIntakePanel({
  url,
  onChange,
  onSubmit,
  disabled,
}: LinkIntakePanelProps) {
  return (
    <div className="jd-ai-intake-form">
      <label className="jd-ai-intake-form__label" htmlFor="jd-intake-link">
        Paste article URL
      </label>
      <div className="jd-ai-intake-form__row">
        <Link2 size={16} className="jd-ai-intake-form__row-icon" aria-hidden />
        <input
          id="jd-intake-link"
          type="url"
          className="jd-ai-intake-form__input jd-ai-intake-form__input--inline"
          placeholder="https://…"
          value={url}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      <button
        type="button"
        className="jd-ai-intake-form__submit anr-btn anr-btn--primary"
        disabled={disabled}
        onClick={onSubmit}
      >
        {disabled ? (
          <>
            <Loader2 size={14} className="spin" /> लिख रहे हैं…
          </>
        ) : (
          <>
            <Sparkles size={14} /> Link → story
          </>
        )}
      </button>
    </div>
  );
}
