"use client";

import type { ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

/** Main content wrapper below global chrome */
export function PageShell({ children, className = "" }: PageShellProps) {
  return (
    <main
      className={`page-shell app-shell__main ${className}`.trim()}
      id="main-content"
    >
      {children}
    </main>
  );
}
