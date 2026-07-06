import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva("jd-btn", {
  variants: {
    variant: {
      default: "jd-btn--primary",
      secondary: "jd-btn--secondary",
      outline: "jd-btn--outline",
      ghost: "jd-btn--ghost",
      destructive: "jd-btn--danger",
    },
    size: {
      default: "",
      sm: "jd-btn--sm",
      lg: "jd-btn--lg",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
