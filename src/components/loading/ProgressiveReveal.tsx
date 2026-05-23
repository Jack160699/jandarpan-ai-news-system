"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ProgressiveRevealProps = {
  children: ReactNode;
  className?: string;
  /** Base delay before first child animates (ms) */
  staggerBase?: number;
};

/**
 * Staggered fade-in for hydrated / lazy-mounted content (CSS only).
 */
export function ProgressiveReveal({
  children,
  className,
  staggerBase = 0,
}: ProgressiveRevealProps) {
  return (
    <div
      className={cn("pl-stagger", className)}
      style={
        staggerBase
          ? ({ "--pl-stagger-base": `${staggerBase}ms` } as React.CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  );
}
