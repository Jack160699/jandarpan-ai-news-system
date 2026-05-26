"use client";

import { QUICK_ACTIONS } from "./mock-ai";
import type { AiQuickActionId } from "./types";

type EditorAiQuickActionsProps = {
  disabled?: boolean;
  onAction: (id: AiQuickActionId) => void;
};

export function EditorAiQuickActions({
  disabled,
  onAction,
}: EditorAiQuickActionsProps) {
  return (
    <div className="jd-ai-quick">
      <p className="jd-ai-quick__label">Quick actions</p>
      <div className="jd-ai-quick__grid">
        {QUICK_ACTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className="jd-ai-quick__btn"
            disabled={disabled}
            onClick={() => onAction(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
