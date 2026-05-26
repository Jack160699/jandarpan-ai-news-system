"use client";

import { Loader2, Sparkles } from "lucide-react";

type TextIntakePanelProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

export function TextIntakePanel({
  value,
  onChange,
  onSubmit,
  disabled,
}: TextIntakePanelProps) {
  return (
    <div className="jd-ai-intake-form">
      <label className="jd-ai-intake-form__label" htmlFor="jd-intake-text">
        Raw text — paste wire, note, or draft
      </label>
      <textarea
        id="jd-intake-text"
        className="jd-ai-intake-form__input jd-ai-intake-form__input--tall"
        rows={8}
        placeholder="यहाँ टेक्स्ट पेस्ट करें… वायर कॉपी, प्रेस नोट, या मसौदा"
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
            <Sparkles size={14} /> Text → story
          </>
        )}
      </button>
    </div>
  );
}
