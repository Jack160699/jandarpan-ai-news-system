import type { ReactNode, HTMLAttributes } from "react";
import { cn } from "@stratxcel/platform/utils/cn";

export type ResponsiveGridProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
};

/**
 * Responsive CSS grid using shell breakpoint tokens.
 */
export function ResponsiveGrid({
  children,
  className,
  columns = 1,
  ...props
}: ResponsiveGridProps) {
  return (
    <div
      className={cn(
        "jdp-grid",
        columns > 1 && `jdp-grid--${columns}`,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
