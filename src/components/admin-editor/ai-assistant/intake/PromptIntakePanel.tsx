"use client";

import { Loader2, Sparkles } from "lucide-react";

type PromptIntakePanelProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

export function PromptIntakePanel({
  value,
  onChange,
  onSubmit,
  disabled,
}: PromptIntakePanelProps) {
  return (
    <div className="jd-ai-intake-form">
      <label className="jd-ai-intake-form__label" htmlFor="jd-intake-prompt">
        Short brief
      </label>
      <textarea
        id="jd-intake-prompt"
        className="jd-ai-intake-form__input"
        rows={3}
        placeholder="कोण, मुख्य तथ्य, भाषा — जैसे: रायपुर में बारिश, प्रशासन अलर्ट"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
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
            <Sparkles size={14} /> Prompt → story
          </>
        )}
      </button>
    </div>
  );
}
