"use client";

import Link from "next/link";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { useLanguage } from "@/providers/LanguageProvider";

function slugToLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function SavedStoriesPanel() {
  const ctx = useEditorialIntelligenceOptional();
  const { t } = useLanguage();
  const memory = ctx?.memory;
  const bookmarks = memory?.bookmarks ?? [];

  if (!bookmarks.length) {
    return (
      <div className="saved-stories-empty mt-6 rounded-xl border border-dashed border-[var(--rule)] p-8 text-center">
        <p className="text-[var(--ink-muted)]">{t.archive.empty}</p>
        <p className="mt-2 text-sm text-[var(--ink-faint)]">
          Tap the bookmark icon on any story to save it here on this device.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-full border border-[var(--rule-strong)] px-5 text-sm font-semibold tap-target"
        >
          {t.archive.backToEdition}
        </Link>
      </div>
    );
  }

  return (
    <ul className="saved-stories-list mt-6 divide-y divide-[var(--rule)]">
      {bookmarks.map((slug) => {
        const progress = memory?.articles[slug];
        const title = progress?.title?.trim() || slugToLabel(slug);
        const pct =
          progress && progress.progress > 0
            ? Math.round(progress.progress * 100)
            : null;

        return (
          <li key={slug} className="saved-stories-list__item py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Link
                  href={`/story/${slug}`}
                  className="font-[family-name:var(--font-display)] text-lg leading-snug hover:opacity-70"
                >
                  {title}
                </Link>
                {pct !== null && pct < 100 ? (
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    {pct}% read
                  </p>
                ) : pct === 100 ? (
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">Finished</p>
                ) : null}
              </div>
              {ctx ? (
                <button
                  type="button"
                  className="shrink-0 text-xs text-[var(--ink-muted)] underline-offset-2 hover:underline tap-target"
                  onClick={() => ctx.toggleArticleBookmark(slug)}
                  aria-label={`Remove ${title} from saved stories`}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
