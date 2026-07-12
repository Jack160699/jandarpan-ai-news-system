import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/design-system/utils/cn";

export type BriefCardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  /** Surface emphasis — default, accent, or muted */
  tone?: "default" | "accent" | "muted";
  as?: "article" | "section" | "div";
};

/**
 * Reusable card shell for Morning Brief sections.
 */
export function BriefCard({
  children,
  className,
  tone = "default",
  as: Tag = "article",
  ...props
}: BriefCardProps) {
  return (
    <Tag
      className={cn(
        "mb-card",
        tone === "accent" && "mb-card--accent",
        tone === "muted" && "mb-card--muted",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
