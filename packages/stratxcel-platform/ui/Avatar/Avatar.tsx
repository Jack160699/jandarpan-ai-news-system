import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@stratxcel/platform/utils/cn";

const avatarVariants = cva("jds-avatar", {
  variants: {
    size: {
      sm: "jds-avatar--sm",
      md: "jds-avatar--md",
      lg: "jds-avatar--lg",
    },
  },
  defaultVariants: { size: "md" },
});

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  initials?: string;
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, src, alt = "", initials, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(avatarVariants({ size }), className)}
      role="img"
      aria-label={alt || initials}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="jds-avatar__image" src={src} alt={alt} />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </div>
  )
);
Avatar.displayName = "Avatar";

export { avatarVariants };
