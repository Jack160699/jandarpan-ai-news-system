import * as React from "react";
import { EditorialCard } from "./EditorialCard";
import type { EditorialCardBaseProps } from "./types";

export interface FeaturedCardProps
  extends EditorialCardBaseProps,
    Omit<React.HTMLAttributes<HTMLElement>, keyof EditorialCardBaseProps> {
  children?: React.ReactNode;
}

/** Lead / featured editorial card with full image and excerpt. */
export const FeaturedCard = React.forwardRef<HTMLElement, FeaturedCardProps>(
  (props, ref) => (
    <EditorialCard ref={ref} variant="featured" layout="vertical" headlineLevel="h2" {...props} />
  )
);
FeaturedCard.displayName = "FeaturedCard";
