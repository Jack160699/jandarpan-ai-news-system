"use client";

import { Wand2, FileText, Languages, Hash, Share2, Type } from "lucide-react";
import type { AiQuickActionId } from "../types";

const TOOLS: {
  id: AiQuickActionId;
  label: string;
  desc: string;
  icon: typeof Wand2;
}[] = [
  {
    id: "improve_headline",
    label: "Improve headline",
    desc: "Sharper, SEO-aware headline options",
    icon: Type,
  },
  {
    id: "rewrite",
    label: "Rewrite",
    desc: "Full body pass for clarity and flow",
    icon: FileText,
  },
  {
    id: "summarize",
    label: "Summarize",
    desc: "Dek-length summary for cards and SEO",
    icon: Wand2,
  },
  {
    id: "translate",
    label: "Translate",
    desc: "Mock translation to English",
    icon: Languages,
  },
  {
    id: "generate_tags",
    label: "Generate tags",
    desc: "Desk taxonomy and discovery tags",
    icon: Hash,
  },
  {
    id: "social_posts",
    label: "Social posts",
    desc: "Short post for X / WhatsApp desk",
    icon: Share2,
  },
];

type ToolsPanelProps = {
  disabled?: boolean;
  onRun: (id: AiQuickActionId) => void;
};

export function ToolsPanel({ disabled, onRun }: ToolsPanelProps) {
  return (
    <div className="jd-ai-panel-body">
      <p className="jd-ai-tools-intro">
        One-click tools for common newsroom tasks. Results open in Chat.
      </p>
      <ul className="jd-ai-tools-list">
        {TOOLS.map(({ id, label, desc, icon: Icon }) => (
          <li key={id}>
            <button
              type="button"
              className="jd-ai-tools-list__btn"
              disabled={disabled}
              onClick={() => onRun(id)}
            >
              <span className="jd-ai-tools-list__icon" aria-hidden>
                <Icon size={16} />
              </span>
              <span className="jd-ai-tools-list__text">
                <strong>{label}</strong>
                <span>{desc}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
