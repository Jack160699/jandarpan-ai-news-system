"use client";

import type { AiAssistantTab } from "./types";

const TABS: { id: AiAssistantTab; label: string }[] = [
  { id: "intake", label: "Intake" },
  { id: "chat", label: "Chat" },
  { id: "tools", label: "Tools" },
  { id: "assets", label: "Assets" },
  { id: "history", label: "History" },
];

type EditorAiTabsProps = {
  active: AiAssistantTab;
  onChange: (tab: AiAssistantTab) => void;
};

export function EditorAiTabs({ active, onChange }: EditorAiTabsProps) {
  return (
    <div className="jd-ai-tabs jd-ai-tabs--main" role="tablist" aria-label="AI assistant sections">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`jd-ai-tabs__btn${active === tab.id ? " is-active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
