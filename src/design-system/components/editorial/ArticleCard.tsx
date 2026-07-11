import * as React from "react";
import { EditorialCard } from "./EditorialCard";
import type { EditorialCardBaseProps } from "./types";

export interface ArticleCardProps
  extends EditorialCardBaseProps,
    Omit<React.HTMLAttributes<HTMLElement>, keyof EditorialCardBaseProps> {
  children?: React.ReactNode;
}

/** Article discovery card — standard vertical layout with full metadata. */
export const ArticleCard = React.forwardRef<HTMLElement, ArticleCardProps>(
  (props, ref) => (
    <EditorialCard ref={ref} variant="standard" layout="vertical" {...props} />
  )
);
ArticleCard.displayName = "ArticleCard";
