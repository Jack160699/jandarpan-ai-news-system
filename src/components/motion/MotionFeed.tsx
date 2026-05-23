"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ElementType,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { useInViewReveal } from "@/hooks/useInViewReveal";

type MotionFeedProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
} & Omit<React.HTMLAttributes<HTMLElement>, "children">;

/**
 * Staggered feed reveal when entering viewport.
 */
export function MotionFeed({
  children,
  className,
  as: Tag = "div",
  ...rest
}: MotionFeedProps) {
  const [ref, isInView] = useInViewReveal<HTMLElement>({
    rootMargin: "0px 0px -4% 0px",
    once: true,
  });

  const items = Children.map(children, (child, i) => {
    if (!isValidElement(child)) return child;
    const el = child as ReactElement<{
      className?: string;
      style?: CSSProperties;
    }>;
    return cloneElement(el, {
      className: cn("motion-feed__item", el.props.className),
      style: {
        ...el.props.style,
        "--motion-i": i,
      } as CSSProperties,
    });
  });

  return (
    <Tag
      ref={ref}
      className={cn("motion-feed", isInView && "motion-feed--in", className)}
      {...rest}
    >
      {items}
    </Tag>
  );
}
