import type { ReactNode } from "react";
import { cn } from "@/design-system/utils/cn";

export type ResponsiveLayout = "stack" | "widgets" | "split" | "stats";

export type ResponsiveProps = {
  children: ReactNode;
  className?: string;
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
        "dv3-responsive",
        layout === "widgets" && "dv3-responsive--widgets",
        layout === "split" && "dv3-responsive--split",
        layout === "stats" && "dv3-responsive--stats",
        className
      )}
    >
      {children}
    </Tag>
  );
}
