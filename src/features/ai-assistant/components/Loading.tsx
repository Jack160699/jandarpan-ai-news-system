"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/design-system/utils/cn";

export type LoadingProps = {
  label?: string;
  className?: string;
  /** Compact inline variant for conversation feed */
  variant?: "page" | "inline";
};

/**
 * Loading state for AI Assistant surfaces.
 */
export function Loading({ label = "Loading conversation…", className, variant = "page" }: LoadingProps) {
  return (
    <div
      className={cn(
        "ai-v3-loading",
        variant === "inline" && "ai-v3-loading--inline",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 size={variant === "inline" ? 18 : 24} className="ai-v3-loading__icon" aria-hidden />
      <span className="ai-v3-loading__label">{label}</span>
    </div>
  );
}
