"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SuperMenuBlockProps = {
  id: string;
  title?: string;
  children: ReactNode;
  className?: string;
};

/** Flat menu section — no accordion */
export function SuperMenuBlock({
  id,
  title,
  children,
  className,
}: SuperMenuBlockProps) {
  return (
    <section className={cn("sm-block", className)} aria-labelledby={title ? id : undefined}>
      {title ? (
        <h2 id={id} className="sm-block__title">
          {title}
        </h2>
      ) : null}
      <div className="sm-block__body">{children}</div>
    </section>
  );
}
