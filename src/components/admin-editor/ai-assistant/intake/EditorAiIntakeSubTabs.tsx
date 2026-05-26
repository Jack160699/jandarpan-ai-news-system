"use client";

import { AlignLeft, FileText, Link2 } from "lucide-react";
import type { AiIntakeMode } from "../types";

const MODES: { id: AiIntakeMode; label: string; icon: typeof FileText }[] = [
  { id: "text", label: "Text", icon: AlignLeft },
  { id: "link", label: "Link", icon: Link2 },
  { id: "prompt", label: "Prompt", icon: FileText },
];

type EditorAiIntakeSubTabsProps = {
  active: AiIntakeMode;
  onChange: (mode: AiIntakeMode) => void;
};

export function EditorAiIntakeSubTabs({
  active,
  onChange,
}: EditorAiIntakeSubTabsProps) {
  return (
    <div
      className="jd-ai-intake-tabs jd-ai-intake-tabs--three"
      role="tablist"
      aria-label="Text intake type"
    >
      {MODES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          className={`jd-ai-intake-tabs__btn${active === id ? " is-active" : ""}`}
          onClick={() => onChange(id)}
        >
          <Icon size={14} aria-hidden />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
