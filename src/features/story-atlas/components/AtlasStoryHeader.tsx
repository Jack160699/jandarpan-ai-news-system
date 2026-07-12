"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { Bookmark, Share2 } from "lucide-react";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { loadReadingMemory, toggleBookmark } from "@/lib/reading-memory";
import { useStoryBack } from "@/hooks/useStoryBack";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";

type AtlasStoryHeaderProps = {
  slug: string;
  title: string;
  url: string;
  progress: number;
  hasThread?: boolean;
};

export const AtlasStoryHeader = memo(function AtlasStoryHeader({
  slug,
  title,
  url,
  progress,
  hasThread = false,
}: AtlasStoryHeaderProps) {
  const { language, t } = useLanguage();
  const goBack = useStoryBack();
  const [saved, setSaved] = useState(false);
  const pct = Math.round(progress * 100);

  useEffect(() => {
    const memory = loadReadingMemory();
    setSaved(memory.bookmarks.includes(slug));
  }, [slug]);

  const onBookmark = useCallback(() => {
    const memory = loadReadingMemory();
    const next = toggleBookmark(memory, slug);
    setSaved(next.bookmarks.includes(slug));
    triggerHaptic("light");
  }, [slug]);

  const onShare = useCallback(async () => {
    triggerHaptic("light");
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  }, [title, url]);

  const backLabel = pickBilingualLabel(language, "Back", "वापस");
  const followingLabel = pickBilingualLabel(
    language,
    "Following this story",
    "इस कहानी को फॉलो कर रहे हैं"
  );
  const bookmarkLabel = saved
    ? hasThread
      ? followingLabel
      : t.article.bookmarked
    : t.article.bookmark;
  const shareLabel = pickBilingualLabel(language, "Share", "शेयर");

  return (
    <header className="atlas-story-header" role="banner">
      <button
        type="button"
        className="atlas-story-header__btn atlas-story-header__back"
        onClick={() => {
          triggerHaptic("selection");
          goBack();
        }}
        aria-label={backLabel}
      >
        ←
      </button>

      <span
        className="atlas-story-header__progress"
        aria-label={pickBilingualLabel(
          language,
          `Reading progress ${pct} percent`,
          `पढ़ने की प्रगति ${pct} प्रतिशत`
        )}
      >
        {pct}%
      </span>

      <div className="atlas-story-header__actions">
        <button
          type="button"
          className="atlas-story-header__btn"
          onClick={onBookmark}
          aria-label={bookmarkLabel}
          aria-pressed={saved}
        >
          <Bookmark size={18} aria-hidden fill={saved ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          className="atlas-story-header__btn"
          onClick={onShare}
          aria-label={shareLabel}
        >
          <Share2 size={18} aria-hidden />
        </button>
      </div>
    </header>
  );
});
