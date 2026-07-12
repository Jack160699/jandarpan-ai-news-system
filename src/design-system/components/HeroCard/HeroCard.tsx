import * as React from "react";
import { EditorialCard } from "../editorial/EditorialCard";
import type { BadgeProps } from "../Badge";

export interface HeroCardProps extends React.HTMLAttributes<HTMLElement> {
  headline: string;
  summary?: string;
  imageUrl?: string;
  imageAlt?: string;
  category?: string;
  categoryVariant?: BadgeProps["variant"];
  author?: string;
  publishedAt?: string;
  publishedAtIso?: string;
  href?: string;
  priority?: boolean;
}

/** @deprecated Use EditorialCard variant="hero" — retained for backward compatibility. */
export const HeroCard = React.forwardRef<HTMLElement, HeroCardProps>(
  ({ summary, priority, ...props }, ref) => (
    <EditorialCard
      ref={ref}
      variant="hero"
      excerpt={summary}
      priority={priority ?? true}
      headlineLevel="h2"
      {...props}
    />
  )
);
HeroCard.displayName = "HeroCard";
