"use client";

import { useCallback, useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/design-system";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { loadReadingMemory, toggleBookmark } from "@/lib/reading-memory";
import { useLanguage } from "@/providers/LanguageProvider";

type SaveForLaterProps = {
  slug: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  onToast?: (message: string) => void;
};

export function SaveForLater({
  slug,
  size = "sm",
  className,
  onToast,
}: SaveForLaterProps) {
  const { t } = useLanguage();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const memory = loadReadingMemory();
    setSaved(memory.bookmarks.includes(slug));
  }, [slug]);

  const onSave = useCallback(() => {
    const memory = loadReadingMemory();
    const next = toggleBookmark(memory, slug);
    const isSaved = next.bookmarks.includes(slug);
    setSaved(isSaved);
    triggerHaptic("light");
    onToast?.(isSaved ? t.article.savedToast : t.article.removedToast);
  }, [slug, onToast, t.article.removedToast, t.article.savedToast]);

  const label = saved ? t.article.bookmarked : t.article.bookmark;

  return (
    <Button
      type="button"
      variant={saved ? "secondary" : "outline"}
      size={size}
      className={className}
      onClick={onSave}
      aria-label={label}
      aria-pressed={saved}
    >
      <Bookmark size={16} aria-hidden fill={saved ? "currentColor" : "none"} />
      <span>{label}</span>
    </Button>
  );
}
