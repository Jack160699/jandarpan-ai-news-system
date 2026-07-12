import type { ReactNode } from "react";
import { cn } from "@/design-system/utils/cn";

export type ResponsiveLayout = "stack" | "widgets" | "split";

export type ResponsiveProps = {
  children: ReactNode;
  className?: string;
  /** Preset responsive grids for brief sections */
  layout?: ResponsiveLayout;
  as?: "div" | "section";
};

/**
 * Responsive layout wrapper — stacks on mobile, grids on tablet+.
 */
export function Responsive({
  children,
  className,
  layout = "stack",
  as: Tag = "div",
}: ResponsiveProps) {
  return (
    <Tag
      className={cn(
        "mb-responsive",
        layout === "widgets" && "mb-responsive--widgets",
        layout === "split" && "mb-responsive--split",
        className
      )}
    >
      {children}
    </Tag>
  );
}
