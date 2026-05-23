"use client";

import type { ReactNode } from "react";

type PageStickyBandProps = {
  children: ReactNode;
  className?: string;
};

/** Homepage / live desk page-level sticky band (live strip + ticker) */
export function PageStickyBand({ children, className = "" }: PageStickyBandProps) {
  return (
    <div
      className={`site-page-stickies newsroom-page-stickies ${className}`.trim()}
      data-page-stickies
    >
      {children}
    </div>
  );
}
