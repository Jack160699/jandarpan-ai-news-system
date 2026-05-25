"use client";

import type { ReactNode } from "react";

type SuperMenuBlockProps = {
  id: string;
  title: string;
  children: ReactNode;
};

/** Flat menu section — no accordion, minimal DOM */
export function SuperMenuBlock({ id, title, children }: SuperMenuBlockProps) {
  return (
    <section className="sm-block" aria-labelledby={id}>
      <h2 id={id} className="sm-block__title">
        {title}
      </h2>
      <div className="sm-block__body">{children}</div>
    </section>
  );
}
