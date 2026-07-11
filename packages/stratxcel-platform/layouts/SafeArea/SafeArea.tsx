import type { ReactNode, HTMLAttributes } from "react";
import { cn } from "@stratxcel/platform/utils/cn";

export type SafeAreaProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  edges?: ("top" | "bottom" | "left" | "right")[];
};

/**
 * Applies iOS safe-area insets for notched devices.
 */
export function SafeArea({
  children,
  className,
  edges,
  ...props
}: SafeAreaProps) {
  const edgeClass =
    edges?.length === 1
      ? `jdp-safe-area--${edges[0]}`
      : edges?.length
        ? edges.map((e) => `jdp-safe-area--${e}`).join(" ")
        : "jdp-safe-area";

  return (
    <div className={cn(edgeClass, className)} {...props}>
      {children}
    </div>
  );
}
