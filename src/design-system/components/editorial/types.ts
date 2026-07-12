import type { BadgeProps } from "../Badge";

/** Canonical editorial card layout variants — single ownership in design system. */
export type EditorialCardVariant =
  | "standard"
  | "compact"
  | "featured"
  | "hero"
  | "summary";

export type EditorialCardLayout = "vertical" | "horizontal";

export type EditorialHeadlineLevel = "h2" | "h3" | "h4";

/** Shared props for all editorial card compositions. */
export interface EditorialCardBaseProps {
  headline: string;
  excerpt?: string;
  imageUrl?: string;
  imageAlt?: string;
  category?: string;
  categoryVariant?: BadgeProps["variant"];
  author?: string;
  /** Pre-formatted publish label */
  publishedAt?: string;
  /** ISO datetime for semantic `<time>` */
  publishedAtIso?: string;
  updatedAt?: string;
  readTime?: string;
  district?: string;
  source?: string;
  confidence?: number;
  href?: string;
  priority?: boolean;
  rank?: number;
  isLive?: boolean;
  isBreaking?: boolean;
  liveLabel?: string;
  breakingLabel?: string;
  badge?: string;
  showAiChip?: boolean;
  aiChipLabel?: string;
  aiChipTitle?: string;
  lang?: string;
  headlineLevel?: EditorialHeadlineLevel;
  imageSizes?: string;
  imageCategory?: string;
  className?: string;
}
