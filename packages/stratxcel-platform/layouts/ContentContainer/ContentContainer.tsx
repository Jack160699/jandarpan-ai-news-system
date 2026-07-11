import type { ReactNode, HTMLAttributes } from "react";
import { cn } from "@stratxcel/platform/utils/cn";
import type { ContentWidthVariant } from "../types";

export type ContentContainerProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  width?: ContentWidthVariant;
};

const widthClass: Record<ContentWidthVariant, string> = {
  article: "jdp-content--article",
  homepage: "jdp-content--homepage",
  dashboard: "jdp-content--dashboard",
  default: "jdp-content--default",
};

/**
 * Horizontally centers content with a max reading width.
 */
export function ContentContainer({
  children,
  className,
  width = "default",
  ...props
}: ContentContainerProps) {
  return (
    <div
      className={cn("jdp-content", widthClass[width], className)}
      {...props}
    >
      {children}
    </div>
  );
}
