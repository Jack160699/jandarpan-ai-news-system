"use client";

import { cn } from "@/lib/cn";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";

type NarrativeTypographyProps = {
  children: React.ReactNode;
  className?: string;
  role?: "headline" | "body" | "statement";
};

export function NarrativeTypography({
  children,
  className,
  role = "body",
}: NarrativeTypographyProps) {
  const ctx = useEditorialIntelligenceOptional();
  const dwelling = ctx?.pacing.isDwelling;
  const rushing = ctx?.pacing.isRushing;

  return (
    <div
      className={cn(
        "type-tempo",
        role === "headline" && "type-tempo--headline",
        role === "body" && "type-tempo--body",
        role === "statement" && "type-tempo--statement",
        dwelling && role === "body" && "tracking-normal",
        rushing && role === "headline" && "opacity-95",
        className
      )}
      data-typography-role={role}
    >
      {children}
    </div>
  );
}
