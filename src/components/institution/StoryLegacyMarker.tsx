"use client";

import type { StoryLegacy } from "@/lib/story-legacy";
import { cn } from "@/lib/cn";

type StoryLegacyMarkerProps = {
  legacy: StoryLegacy;
  currentChapter?: number;
  className?: string;
};

export function StoryLegacyMarker({
  legacy,
  currentChapter = legacy.chapters.length,
  className,
}: StoryLegacyMarkerProps) {
  const statusLabel =
    legacy.status === "ongoing"
      ? "Ongoing investigation"
      : legacy.status === "watching"
        ? "Editorial watch"
        : "Concluded filing";

  return (
    <aside
      className={cn(
        "border-t border-b border-[var(--rule)] py-8 md:py-10",
        className
      )}
    >
      <p className="archive-marker">{statusLabel}</p>
      <p className="mt-3 font-[family-name:var(--font-display)] text-lg tracking-tight">
        Thread: {legacy.threadTitle}
      </p>
      <p className="meta-label mt-2 text-[var(--ink-muted)]">
        Opened {legacy.started} · Last updated {legacy.lastUpdated}
      </p>

      {legacy.archiveRef ? (
        <p className="filing-ref mt-4">Archive {legacy.archiveRef}</p>
      ) : null}

      <nav className="legacy-thread" aria-label="Chapters in this thread">
        {legacy.chapters.map((ch) => (
          <span
            key={ch.number}
            className={`legacy-thread__chapter ${ch.number === currentChapter ? "is-current" : ""}`}
          >
            {ch.number}. {ch.label}
            {ch.filed ? ` · ${ch.filed}` : ""}
          </span>
        ))}
      </nav>

      {legacy.updates.length > 0 ? (
        <div className="mt-8">
          <p className="archive-marker mb-3">Editorial record</p>
          <ul className="space-y-2">
            {legacy.updates.slice(0, 3).map((u) => (
              <li key={u.date + u.label} className="editorial-body text-sm">
                <span className="meta-label text-[var(--ink-faint)]">
                  {u.date}
                </span>
                <span className="text-[var(--ink-secondary)]"> — {u.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {legacy.status === "ongoing" ? (
        <p className="editorial-body mt-6 max-w-prose text-sm text-[var(--ink-muted)]">
          This filing will be updated as the desk receives new testimony and
          documents. The Chronicle maintains the thread in the public record.
        </p>
      ) : null}
    </aside>
  );
}
