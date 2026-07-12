import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils";

const skeletonVariants = cva("jds-skeleton", {
  variants: {
    variant: {
      text: "jds-skeleton--text",
      title: "jds-skeleton--title",
      avatar: "jds-skeleton--avatar",
      media: "jds-skeleton--media",
    },
  },
  defaultVariants: {
    variant: "text",
  },
});

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

/**
 * Placeholder shimmer for loading content blocks.
 */
export function Skeleton({ className, variant, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(skeletonVariants({ variant }), className)}
      aria-hidden
      {...props}
    />
  );
}

export { skeletonVariants };
