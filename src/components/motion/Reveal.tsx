"use client";

import {
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { useInViewReveal } from "@/hooks/useInViewReveal";

type RevealProps = {
  children: ReactNode;
  className?: string;
  index?: number;
  as?: ElementType;
  rootMargin?: string;
  once?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, "children">;

/**
 * Scroll-triggered fade-up — opacity + translateY only.
 */
export function Reveal({
  children,
  className,
  index = 0,
  as: Tag = "div",
  rootMargin,
  once = true,
  style,
  ...rest
}: RevealProps) {
  const [ref, isInView] = useInViewReveal<HTMLElement>({
    rootMargin,
    once,
  });

  const mergedStyle = {
    ...style,
    "--motion-i": index,
  } as CSSProperties;

  return (
    <Tag
      ref={ref}
      className={cn("motion-reveal", isInView && "motion-reveal--in", className)}
      style={mergedStyle}
      {...rest}
    >
      {children}
    </Tag>
  );
}
