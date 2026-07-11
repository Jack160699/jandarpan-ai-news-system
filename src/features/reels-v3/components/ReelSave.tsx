"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { focusRingClass } from "@/design-system/utils/aria";
import { cn } from "@/lib/cn";
import {
  getBookmarkedSlugs,
  toggleShortBookmark,
} from "@/lib/news/shorts/bookmarks";
import { useLanguage } from "@/providers/LanguageProvider";

type ReelSaveProps = {
  slug: string;
  className?: string;
};

/**
 * JDP-017 — Save / bookmark action
 */
export function ReelSave({ slug, className }: ReelSaveProps) {
  const { t } = useLanguage();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(getBookmarkedSlugs().includes(slug));
  }, [slug]);

  return (
    <button
      type="button"
      className={cn(
        "reels-v3-action tap-target",
        saved && "reels-v3-action--on",
        focusRingClass,
        className
      )}
      onClick={() => setSaved(toggleShortBookmark(slug))}
      aria-label={saved ? t.shorts.bookmarked : t.shorts.bookmark}
      aria-pressed={saved}
    >
      <span className="reels-v3-action__icon" aria-hidden>
        <Bookmark
          size={22}
          strokeWidth={2}
          fill={saved ? "currentColor" : "none"}
        />
      </span>
    </button>
  );
}
