import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "../../utils";

export interface AISummaryProps extends React.HTMLAttributes<HTMLElement> {
  summary: string;
  label?: string;
  loading?: boolean;
}

/**
 * AI-generated summary callout with distinct editorial-ai styling.
 */
export function AISummary({
  summary,
  label = "AI Summary",
  loading,
  className,
  ...props
}: AISummaryProps) {
  return (
    <aside
      className={cn("jds-ai-summary", className)}
      aria-label={label}
      aria-busy={loading || undefined}
      {...props}
    >
      <div className="jds-ai-summary__header">
        <Sparkles size={16} aria-hidden style={{ color: "var(--jds-color-ai)" }} />
        <span className="jds-ai-summary__label">{label}</span>
      </div>
      {loading ? (
        <div className="jds-skeleton jds-skeleton--text" aria-hidden />
      ) : (
        <p className="jds-ai-summary__body">{summary}</p>
      )}
    </aside>
  );
}
