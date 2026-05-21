"use client";

import { TypographyCinema } from "./TypographyCinema";
import { IncompleteReveal } from "@/components/motion/IncompleteReveal";

type EditorialFrameProps = {
  statement: string;
  subline?: string;
};

export function EditorialFrame({ statement, subline }: EditorialFrameProps) {
  return (
    <div className="editorial-frame visual-decompression">
      <IncompleteReveal initialClip={0.2}>
        <TypographyCinema scaleOnScroll>
          <p className="editorial-frame__statement">{statement}</p>
        </TypographyCinema>
      </IncompleteReveal>
      {subline ? (
        <p className="meta-label mt-8 text-center text-[var(--ink-faint)]">
          {subline}
        </p>
      ) : null}
    </div>
  );
}
