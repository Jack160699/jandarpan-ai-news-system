import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "../../utils";

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * Error fallback for failed data fetches and broken sections.
 */
export function ErrorState({
  title,
  description,
  actions,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn("jds-error", className)}
      role="alert"
      {...props}
    >
      <AlertCircle className="jds-error__icon" aria-hidden />
      <h2 className="jds-error__title">{title}</h2>
      {description ? (
        <div className="jds-error__description">{description}</div>
      ) : null}
      {actions ? (
        <div className="jds-error__actions">{actions}</div>
      ) : null}
    </div>
  );
}
