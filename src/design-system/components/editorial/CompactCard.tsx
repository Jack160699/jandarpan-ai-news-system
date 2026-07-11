import * as React from "react";
import { EditorialCard } from "./EditorialCard";
import type { EditorialCardBaseProps } from "./types";

export interface CompactCardProps
  extends EditorialCardBaseProps,
    Omit<React.HTMLAttributes<HTMLElement>, keyof EditorialCardBaseProps> {
  children?: React.ReactNode;
}

/** Dense horizontal editorial card for feeds and search results. */
export const CompactCard = React.forwardRef<HTMLElement, CompactCardProps>(
  (props, ref) => <EditorialCard ref={ref} variant="compact" layout="horizontal" {...props} />
);
CompactCard.displayName = "CompactCard";
