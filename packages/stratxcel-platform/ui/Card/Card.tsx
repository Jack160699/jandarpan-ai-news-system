import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@stratxcel/platform/utils/cn";

const cardVariants = cva("jds-card", {
  variants: {
    elevation: {
      flat: "",
      elevated: "jds-card--elevated",
    },
    interactive: {
      true: "jds-card--interactive jds-interactive",
      false: "",
    },
  },
  defaultVariants: {
    elevation: "flat",
    interactive: false,
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevation, interactive, children, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ elevation, interactive }), className)} {...props}>
      {children}
    </div>
  )
);
Card.displayName = "Card";

export type CardBodyProps = React.HTMLAttributes<HTMLDivElement>;

export const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("jds-card__body", className)} {...props} />
  )
);
CardBody.displayName = "CardBody";

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("jds-card__header", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("jds-card__footer", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { cardVariants };
