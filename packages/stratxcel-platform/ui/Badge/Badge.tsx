import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@stratxcel/platform/utils/cn";

const badgeVariants = cva("jds-badge", {
  variants: {
    variant: {
      default: "jds-badge--default",
      brand: "jds-badge--brand",
      breaking: "jds-badge--breaking",
      ai: "jds-badge--ai",
      success: "jds-badge--success",
      warning: "jds-badge--warning",
      danger: "jds-badge--danger",
      government: "jds-badge--default",
      weather: "jds-badge--default",
      sports: "jds-badge--default",
      business: "jds-badge--default",
      politics: "jds-badge--default",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, children, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  )
);
Badge.displayName = "Badge";

export { badgeVariants };
