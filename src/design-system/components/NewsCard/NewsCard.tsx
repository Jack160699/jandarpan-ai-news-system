import * as React from "react";
import { EditorialCard } from "../editorial/EditorialCard";
import type { BadgeProps } from "../Badge";

export interface NewsCardProps extends React.HTMLAttributes<HTMLElement> {
  headline: string;
  excerpt?: string;
  imageUrl?: string;
  imageAlt?: string;
  category?: string;
  categoryVariant?: BadgeProps["variant"];
  author?: string;
  publishedAt?: string;
  publishedAtIso?: string;
  readTime?: string;
  district?: string;
  source?: string;
  href?: string;
  layout?: "vertical" | "horizontal";
  priority?: boolean;
}

/** @deprecated Use EditorialCard or CompactCard — retained for backward compatibility. */
export const NewsCard = React.forwardRef<HTMLElement, NewsCardProps>(
  ({ layout = "vertical", priority, ...props }, ref) => (
    <EditorialCard
      ref={ref}
      variant={layout === "horizontal" ? "compact" : "standard"}
      layout={layout}
      priority={priority}
      {...props}
    />
  )
);
NewsCard.displayName = "NewsCard";
