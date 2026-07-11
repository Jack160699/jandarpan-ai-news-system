import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@stratxcel/platform/utils/cn";
import { focusRingClass, loadingAriaProps } from "@stratxcel/platform/accessibility/aria";

const buttonVariants = cva(
  cn("jds-button", "jds-interactive", focusRingClass),
  {
    variants: {
      variant: {
        primary: "jds-button--primary",
        secondary: "jds-button--secondary",
        outline: "jds-button--outline",
        ghost: "jds-button--ghost",
        danger: "jds-button--danger",
      },
      size: {
        sm: "jds-button--sm",
        md: "",
        lg: "jds-button--lg",
      },
      loading: {
        true: "jds-button--loading",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      loading: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

/** Primary interactive button primitive with loading, disabled, and focus states. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, loading: isLoading }), className)}
      disabled={disabled || isLoading}
      {...loadingAriaProps(!!isLoading)}
      {...props}
    >
      {children}
      {isLoading && <span className="jds-button__spinner" aria-hidden />}
    </button>
  )
);
Button.displayName = "Button";

export { buttonVariants };
