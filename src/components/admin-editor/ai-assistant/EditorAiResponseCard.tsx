"use client";

import { ArrowDownToLine, Copy } from "lucide-react";
import { copyToClipboard } from "./lib/browser-safe";
import { ClientTimeLabel } from "./ui/ClientTimeLabel";
import type { AiResponse } from "./types";

type EditorAiResponseCardProps = {
  response: AiResponse;
  onApply: (response: AiResponse, item?: string) => void;
};

export function EditorAiResponseCard({
  response,
  onApply,
}: EditorAiResponseCardProps) {
  const canInsertBody =
    response.kind === "body" ||
    response.actionId === "rewrite" ||
    response.actionId === "translate";

  return (
    <article className="jd-ai-card">
      <header className="jd-ai-card__head">
        <strong>{response.title}</strong>
        <ClientTimeLabel
          iso={response.createdAt}
          preset="time"
          className="jd-ai-card__time"
        />
      </header>
      <p className="jd-ai-card__body">{response.content}</p>

      {response.items?.length ? (
        <ul className="jd-ai-card__list">
          {response.items.map((item) => (
            <li key={item}>
              <span>{item}</span>
              <button
                type="button"
                className="jd-ai-card__pick"
                onClick={() => onApply(response, item)}
              >
                Use
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <footer className="jd-ai-card__actions">
        {canInsertBody ? (
          <button
            type="button"
            className="jd-ai-card__action jd-ai-card__action--primary"
            onClick={() => onApply(response)}
          >
            <ArrowDownToLine size={14} />
            Insert in editor
          </button>
        ) : response.kind === "tags" ? (
          <button
            type="button"
            className="jd-ai-card__action jd-ai-card__action--primary"
            onClick={() => onApply(response)}
          >
            Apply tags
          </button>
        ) : response.kind === "text" && response.actionId === "summarize" ? (
          <button
            type="button"
            className="jd-ai-card__action jd-ai-card__action--primary"
            onClick={() => onApply(response)}
          >
            Update summary
          </button>
        ) : response.kind === "social" ? (
          <button
            type="button"
            className="jd-ai-card__action"
            onClick={() => onApply(response)}
          >
            Save to assets
          </button>
        ) : null}
        <button
          type="button"
          className="jd-ai-card__action"
          onClick={() => {
            void copyToClipboard(response.items?.join("\n") ?? response.content);
          }}
        >
          <Copy size={14} />
          Copy
        </button>
      </footer>
    </article>
  );
}
