import type { ReactNode } from "react";

export type PremiumReelCardProps = {
  children: ReactNode;
  className?: string;
};

/** Wraps reel preview shell with premium elevation */
export function PremiumReelCard({ children, className = "" }: PremiumReelCardProps) {
  return (
    <div className={`pcard pcard--reel pcard-enter ${className}`.trim()}>
      {children}
    </div>
  );
}
