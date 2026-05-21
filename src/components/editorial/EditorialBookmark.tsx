"use client";

import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";

type EditorialBookmarkProps = {
  slug: string;
};

export function EditorialBookmark({ slug }: EditorialBookmarkProps) {
  const ctx = useEditorialIntelligenceOptional();
  if (!ctx) return null;

  const saved = ctx.isBookmarked(slug);

  return (
    <button
      type="button"
      onClick={() => ctx.toggleArticleBookmark(slug)}
      className={`bookmark-control meta-label border border-[var(--rule)] px-3 py-1.5 transition-colors hover:border-[var(--rule-strong)] ${saved ? "is-saved" : ""}`}
      aria-pressed={saved}
    >
      {saved ? "Bookmarked" : "Bookmark filing"}
    </button>
  );
}
