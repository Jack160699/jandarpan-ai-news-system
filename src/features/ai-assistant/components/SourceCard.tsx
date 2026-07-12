"use client";

import { ExternalLink, Newspaper } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import type { AiSource } from "../types";

export type SourceCardProps = {
  source: AiSource;
  index?: number;
  className?: string;
};

/**
 * Citation card linking to a newsroom article or external source.
 */
export function SourceCard({ source, index, className }: SourceCardProps) {
  const label =
    index !== undefined ? `Source ${index + 1}: ${source.title}` : source.title;

  return (
    <article className={cn("ai-v3-source", className)} aria-label={label}>
      <div className="ai-v3-source__icon" aria-hidden>
        <Newspaper size={16} />
      </div>
      <div className="ai-v3-source__body">
        <div className="ai-v3-source__meta">
          {index !== undefined && (
            <span className="ai-v3-source__index">[{index + 1}]</span>
          )}
          {source.outlet && <span className="ai-v3-source__outlet">{source.outlet}</span>}
          {source.publishedAt && (
            <span className="ai-v3-source__time">{source.publishedAt}</span>
          )}
        </div>
        <h4 className="ai-v3-source__title">
          <a
            href={source.url}
            className="ai-v3-source__link jds-focus-ring"
            target={source.url.startsWith("http") ? "_blank" : undefined}
            rel={source.url.startsWith("http") ? "noopener noreferrer" : undefined}
          >
            {source.title}
            <ExternalLink size={12} aria-hidden className="ai-v3-source__external" />
          </a>
        </h4>
        {source.excerpt && <p className="ai-v3-source__excerpt">{source.excerpt}</p>}
      </div>
    </article>
  );
}
