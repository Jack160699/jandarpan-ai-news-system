import * as React from "react";
import { cn } from "../../utils";

export interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  /** Cover parent with semi-transparent overlay */
  overlay?: boolean;
}

/**
 * Inline or overlay loading indicator with accessible status.
 */
export function Loading({
  label = "Loading",
  overlay,
  className,
  ...props
}: LoadingProps) {
  return (
    <div
      className={cn(
        "jds-loading",
        overlay && "jds-loading--overlay",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
      {...props}
    >
      <span className="jds-loading__spinner" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
