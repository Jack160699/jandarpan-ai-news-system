import * as React from "react";
import { cn } from "@stratxcel/platform/utils/cn";
import { focusRingClass } from "@stratxcel/platform/accessibility/aria";

export interface NavigationItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  active?: boolean;
}

export interface NavigationProps extends React.HTMLAttributes<HTMLElement> {
  items: NavigationItem[];
  onItemClick?: (item: NavigationItem) => void;
  ariaLabel?: string;
}

export const Navigation = React.forwardRef<HTMLElement, NavigationProps>(
  ({ className, items, onItemClick, ariaLabel = "Main navigation", ...props }, ref) => (
    <nav ref={ref} className={cn("jds-nav", className)} aria-label={ariaLabel} {...props}>
      {items.map((item) => {
        const classNames = cn(
          "jds-nav__item",
          "jds-interactive",
          focusRingClass,
          item.active && "jds-nav__item--active"
        );

        if (item.href) {
          return (
            <a
              key={item.id}
              href={item.href}
              className={classNames}
              aria-current={item.active ? "page" : undefined}
              onClick={() => onItemClick?.(item)}
            >
              {item.icon}
              {item.label}
            </a>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            className={classNames}
            aria-current={item.active ? "page" : undefined}
            onClick={() => onItemClick?.(item)}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </nav>
  )
);
Navigation.displayName = "Navigation";
