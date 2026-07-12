import * as React from "react";
import { EditorialCard } from "./EditorialCard";
import type { EditorialCardBaseProps } from "./types";

export interface SummaryCardProps
  extends EditorialCardBaseProps,
    Omit<React.HTMLAttributes<HTMLElement>, keyof EditorialCardBaseProps> {
  children?: React.ReactNode;
}

/** Text-forward card without media — briefs, wire items, quick updates. */
export const SummaryCard = React.forwardRef<HTMLElement, SummaryCardProps>(
  (props, ref) => (
    <EditorialCard ref={ref} variant="summary" layout="horizontal" {...props} />
  )
);
SummaryCard.displayName = "SummaryCard";
