import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/design-system/utils/cn";

export type DistrictCardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  tone?: "default" | "accent" | "muted";
  as?: "article" | "section" | "div";
};

/**
 * Reusable card shell for District V3 sections.
 */
export function DistrictCard({
  children,
  className,
  tone = "default",
  as: Tag = "article",
  ...props
}: DistrictCardProps) {
  return (
    <Tag
      className={cn(
        "dv3-card",
        tone === "accent" && "dv3-card--accent",
        tone === "muted" && "dv3-card--muted",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
