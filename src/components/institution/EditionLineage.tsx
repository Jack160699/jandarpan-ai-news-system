import {
  getEditionLineage,
  getPublishingLineage,
  INSTITUTION,
} from "@/lib/institution";
import { cn } from "@/lib/cn";

type EditionLineageProps = {
  compact?: boolean;
  className?: string;
};

export function EditionLineage({ compact, className }: EditionLineageProps) {
  return (
    <div className={cn(className)}>
      <p className="meta-label text-[var(--ink-muted)]">
        {getEditionLineage()}
      </p>
      {!compact ? (
        <>
          <p className="meta-label mt-2 text-[var(--ink-faint)]">
            {getPublishingLineage()}
          </p>
          <p className="archive-marker mt-4">
            {INSTITUTION.name} · {INSTITUTION.tagline}
          </p>
        </>
      ) : null}
    </div>
  );
}
