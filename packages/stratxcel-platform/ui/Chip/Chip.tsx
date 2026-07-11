import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@stratxcel/platform/utils/cn";
import { focusRingClass } from "@stratxcel/platform/accessibility/aria";

const chipVariants = cva(cn("jds-chip", "jds-interactive", focusRingClass), {
  variants: {
    selected: { true: "jds-chip--selected", false: "" },
    topic: {
      default: "",
      politics: "jds-chip--politics",
      sports: "jds-chip--sports",
      business: "jds-chip--business",
      weather: "jds-chip--weather",
      government: "jds-chip--government",
    },
  },
  defaultVariants: { selected: false, topic: "default" },
});

export interface ChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof chipVariants> {
  href?: string;
}

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, selected, topic, href, children, disabled, onClick, ...props }, ref) => {
    if (href) {
      return (
        <a
          href={href}
          className={cn(chipVariants({ selected, topic }), className)}
          aria-pressed={selected ?? undefined}
        >
          {children}
        </a>
      );
    }

    return (
      <button
        ref={ref}
        type="button"
        className={cn(chipVariants({ selected, topic }), className)}
        disabled={disabled}
        aria-pressed={selected ?? undefined}
        onClick={onClick}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Chip.displayName = "Chip";

export { chipVariants };
