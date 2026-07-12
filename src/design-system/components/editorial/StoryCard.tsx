import * as React from "react";
import { EditorialCard } from "./EditorialCard";
import type { EditorialCardBaseProps } from "./types";

export interface StoryCardProps
  extends EditorialCardBaseProps,
    Omit<React.HTMLAttributes<HTMLElement>, keyof EditorialCardBaseProps> {
  /** Rail, grid, or row density — maps to card variant. */
  density?: "rail" | "grid" | "row";
  children?: React.ReactNode;
}

/** Standard story listing card for homepage grids and related stories. */
export const StoryCard = React.forwardRef<HTMLElement, StoryCardProps>(
  ({ density = "grid", ...props }, ref) => {
    const variant = density === "row" ? "compact" : "standard";
    const layout = density === "row" ? "horizontal" : "vertical";

    return (
      <EditorialCard
        ref={ref}
        variant={variant}
        layout={layout}
        {...props}
      />
    );
  }
);
StoryCard.displayName = "StoryCard";
