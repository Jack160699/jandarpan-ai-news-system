import * as React from "react";
import { cn } from "@stratxcel/platform/utils/cn";
import { focusRingClass } from "@stratxcel/platform/accessibility/aria";

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  kicker?: string;
  action?: React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
  onActionClick?: () => void;
}

export const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>(
  ({ className, title, kicker, action, actionLabel, actionHref, onActionClick, ...props }, ref) => {
    const actionElement =
      action ??
      (actionLabel && actionHref ? (
        <a href={actionHref} className={cn("jds-section-header__action", focusRingClass)}>
          {actionLabel}
        </a>
      ) : actionLabel && onActionClick ? (
        <button
          type="button"
          onClick={onActionClick}
          className={cn("jds-section-header__action", focusRingClass)}
        >
          {actionLabel}
        </button>
      ) : null);

    return (
      <div ref={ref} className={cn("jds-section-header", className)} {...props}>
        <div>
          {kicker && <p className="jds-section-header__kicker">{kicker}</p>}
          <h2 className="jds-section-header__title">{title}</h2>
        </div>
        {actionElement}
      </div>
    );
  }
);
SectionHeader.displayName = "SectionHeader";
