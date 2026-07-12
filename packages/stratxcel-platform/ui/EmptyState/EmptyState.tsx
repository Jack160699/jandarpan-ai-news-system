import * as React from "react";
import { cn } from "../../utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Accessible empty state for lists, search results, and saved items.
 */
export function EmptyState({
  title,
  description,
  icon = "◌",
  children,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div className={cn("jds-empty", className)} role="status" {...props}>
      <div className="jds-empty__icon" aria-hidden>
        {icon}
      </div>
      <h2 className="jds-empty__title">{title}</h2>
      {description ? (
        <div className="jds-empty__description">{description}</div>
      ) : null}
      {children}
    </div>
  );
}
