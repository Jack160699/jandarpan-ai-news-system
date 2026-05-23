"use client";

import { BookmarkButton } from "@/components/mobile/BookmarkButton";
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
    <BookmarkButton
      saved={saved}
      onToggle={() => ctx.toggleArticleBookmark(slug)}
      label={t.article.bookmark}
      labelSaved={t.article.bookmarked}
      className="bookmark-control meta-label"
    />
  );
}
