"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BookmarkButton } from "@/components/mobile/BookmarkButton";
import { StoryReadingProgress } from "@/components/story/StoryReadingProgress";
import { triggerHaptic } from "@/lib/mobile/haptics";
import {
  loadReadingMemory,
  toggleBookmark,
} from "@/lib/reading-memory";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";

type StoryReaderToolbarProps = {
  slug: string;
  title: string;
  url: string;
  readTime: string;
};

export function StoryReaderToolbar({
  slug,
  title,
  url,
  readTime,
}: StoryReaderToolbarProps) {
  const { t } = useLanguage();
  const { prefs, toggleTheme, cycleFontScale, toggleReadingMode } =
    useReaderPreferences();
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const memory = loadReadingMemory();
    setSaved(memory.bookmarks.includes(slug));
  }, [slug]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, []);

  const onSave = () => {
    const memory = loadReadingMemory();
    const next = toggleBookmark(memory, slug);
    const isSaved = next.bookmarks.includes(slug);
    setSaved(isSaved);
    showToast(isSaved ? t.article.savedToast : t.article.removedToast);
  };

  const onCopy = async () => {
    triggerHaptic("light");
    try {
      await navigator.clipboard.writeText(url);
      showToast(t.common.linkCopied);
    } catch {
      showToast("Could not copy link");
    }
  };

  const onShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* cancelled */
      }
    }
    onCopy();
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <>
      <StoryReadingProgress />

      <div className="immersive-chrome" role="toolbar" aria-label="Reading tools">
        <Link href="/" className="immersive-chrome__back tap-target">
          ← Edition
        </Link>

        <div className="immersive-chrome__tools">
          <span className="hidden sm:inline font-[family-name:var(--font-ui)] text-xs text-[var(--ink-muted)]">
            {readTime}
          </span>

          <BookmarkButton
            saved={saved}
            onToggle={onSave}
            size="sm"
            label=""
            labelSaved=""
            className="immersive-tool"
          />

          <button
            type="button"
            className="immersive-tool tap-target"
            onClick={toggleTheme}
            aria-label={prefs.theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {prefs.theme === "dark" ? "☀" : "☾"}
          </button>

          <button
            type="button"
            className="immersive-tool tap-target"
            onClick={cycleFontScale}
            aria-label="Adjust text size"
          >
            A+
          </button>

          <button
            type="button"
            className="immersive-tool tap-target hidden sm:inline-flex"
            onClick={toggleReadingMode}
            aria-label="Comfort reading mode"
          >
            {prefs.readingMode === "comfort" ? "Std" : "Comfort"}
          </button>

          <button
            type="button"
            className="immersive-tool tap-target"
            onClick={onCopy}
            aria-label="Copy link"
          >
            ⧉
          </button>

          <button
            type="button"
            className="immersive-tool tap-target"
            onClick={onShare}
            aria-label="Share article"
          >
            ↗
          </button>

          <a
            href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="immersive-tool tap-target hidden md:inline-flex"
            aria-label="Share on WhatsApp"
          >
            WA
          </a>
        </div>
      </div>

      <div
        className={`immersive-tool__toast ${toast ? "immersive-tool__toast--show" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast}
      </div>
    </>
  );
}
