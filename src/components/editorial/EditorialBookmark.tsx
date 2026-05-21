"use client";

import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { useLanguage } from "@/providers/LanguageProvider";

type EditorialBookmarkProps = {
  slug: string;
};

export function EditorialBookmark({ slug }: EditorialBookmarkProps) {
  const ctx = useEditorialIntelligenceOptional();
  const { t } = useLanguage();
  if (!ctx) return null;

  const saved = ctx.isBookmarked(slug);

  return (
    <button
      type="button"
      onClick={() => ctx.toggleArticleBookmark(slug)}
      className={`bookmark-control meta-label border border-[var(--rule)] px-3 py-1.5 transition-colors hover:border-[var(--rule-strong)] tap-target ${saved ? "is-saved" : ""}`}
      aria-pressed={saved}
    >
      {saved ? t.article.bookmarked : t.article.bookmark}
    </button>
  );
}
