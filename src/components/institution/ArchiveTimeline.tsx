import Link from "next/link";
import { ARCHIVE_TIMELINE, getArchiveByYear } from "@/lib/archive";
import { cn } from "@/lib/cn";

type ArchiveTimelineProps = {
  limit?: number;
  className?: string;
};

export function ArchiveTimeline({ limit, className }: ArchiveTimelineProps) {
  const byYear = getArchiveByYear();
  const years = [...byYear.keys()].sort((a, b) => b - a);
  let count = 0;

  return (
    <div className={cn("archive-timeline", className)}>
      {years.map((year) => {
        const entries = byYear.get(year) ?? [];
        const visible = limit
          ? entries.filter(() => {
              if (count >= limit) return false;
              count++;
              return true;
            })
          : entries;

        if (!visible.length) return null;

        return (
          <section key={year} className="mb-16 last:mb-0">
            <h3 className="archive-year">{year}</h3>
            {visible.map((entry) => (
              <article
                key={entry.id}
                className={cn(
                  "archive-entry",
                  entry.kind === "investigation" && "archive-entry--investigation"
                )}
              >
                <p className="archive-marker">{entry.era}</p>
                {entry.slug ? (
                  <Link
                    href={`/story/${entry.slug}`}
                    className="story-link headline-sm mt-2 block max-w-[28ch]"
                  >
                    {entry.title}
                  </Link>
                ) : (
                  <h4 className="headline-sm mt-2 max-w-[28ch]">{entry.title}</h4>
                )}
                <p className="meta-label mt-2 text-[var(--ink-muted)]">
                  {entry.desk}
                  {entry.kind === "investigation" ? " · Investigation" : ""}
                </p>
                {entry.note ? (
                  <p className="editorial-body mt-3 max-w-prose text-sm text-[var(--ink-secondary)]">
                    {entry.note}
                  </p>
                ) : null}
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}
