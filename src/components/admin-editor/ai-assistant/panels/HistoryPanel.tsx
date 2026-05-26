"use client";

import { ClientTimeLabel } from "../ui/ClientTimeLabel";
import type { AiHistoryEntry } from "../types";

type HistoryPanelProps = {
  history: AiHistoryEntry[];
};

export function HistoryPanel({ history }: HistoryPanelProps) {
  return (
    <div className="jd-ai-panel-body">
      {history.length === 0 ? (
        <p className="jd-ai-empty">Your recent AI requests will show here.</p>
      ) : (
        <ul className="jd-ai-history">
          {history.map((entry) => (
            <li key={entry.id} className="jd-ai-history__item">
              <strong>{entry.actionLabel}</strong>
              <p>{entry.prompt}</p>
              <ClientTimeLabel iso={entry.createdAt} preset="datetime-medium" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
