import type { ReactNode } from "react";

export type PremiumLiveCardProps = {
  children: ReactNode;
  variant?: "wire" | "breaking";
  className?: string;
};

/** Wraps live update content with premium surface + motion */
export function PremiumLiveCard({
  children,
  variant = "wire",
  className = "",
}: PremiumLiveCardProps) {
  return (
    <div
      className={`pcard pcard--live pcard-enter ${variant === "breaking" ? "pcard--live-breaking" : ""} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
