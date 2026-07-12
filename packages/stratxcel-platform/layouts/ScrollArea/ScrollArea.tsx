import type { ReactNode, HTMLAttributes } from "react";
import { cn } from "@stratxcel/platform/utils/cn";

export type ScrollAreaProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  smooth?: boolean;
};

/**
 * Scrollable region with overscroll containment and reduced-motion support.
 */
export function ScrollArea({
  children,
  className,
  smooth = true,
  ...props
}: ScrollAreaProps) {
  return (
    <div
      className={cn("jdp-scroll", smooth && "jdp-scroll--smooth", className)}
      {...props}
    >
      {children}
    </div>
  );
}
