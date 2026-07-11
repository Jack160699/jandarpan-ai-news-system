"use client";

import { useCallback, useState } from "react";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { useStoryBack } from "@/hooks/useStoryBack";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { ReadingProgress } from "./ReadingProgress";
import { SaveForLater } from "./SaveForLater";
import { ListenButton } from "./ListenButton";
import type { ArticleV3ToolbarProps } from "../types";

type ReadingToolbarProps = ArticleV3ToolbarProps & {
  summary?: string;
};

export function ReadingToolbar({
  slug,
  title,
  url,
  readTime,
  summary,
}: ReadingToolbarProps) {
  const { t } = useLanguage();
  const { prefs, toggleTheme, cycleFontScale, toggleReadingMode } =
    useReaderPreferences();
  const goBack = useStoryBack();
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, []);

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

  return (
    <>
      <ReadingProgress />

      <div className="article-v3-toolbar" role="toolbar" aria-label="Reading tools">
        <button
          type="button"
          className="article-v3-toolbar__back"
          onClick={() => {
            triggerHaptic("selection");
            goBack();
          }}
        >
          ← Edition
        </button>

        <div className="article-v3-toolbar__tools">
          <span className="article-v3-toolbar__meta">{readTime}</span>

          <SaveForLater slug={slug} onToast={showToast} />

          <ListenButton
            articleId={slug}
            headline={title}
            summary={summary}
            className="article-v3-action-btn"
          />

          <button
            type="button"
            className="article-v3-toolbar__back"
            onClick={toggleTheme}
            aria-label={prefs.theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {prefs.theme === "dark" ? "☀" : "☾"}
          </button>

          <button
            type="button"
            className="article-v3-toolbar__back"
            onClick={cycleFontScale}
            aria-label="Adjust text size"
          >
            A+
          </button>

          <button
            type="button"
            className="article-v3-toolbar__back hidden sm:inline-flex"
            onClick={toggleReadingMode}
            aria-label="Comfort reading mode"
          >
            {prefs.readingMode === "comfort" ? "Std" : "Comfort"}
          </button>

          <button
            type="button"
            className="article-v3-toolbar__back"
            onClick={onCopy}
            aria-label="Copy link"
          >
            ⧉
          </button>

          <button
            type="button"
            className="article-v3-toolbar__back"
            onClick={onShare}
            aria-label="Share article"
          >
            ↗
          </button>
        </div>
      </div>

      <div
        className={`article-v3-toolbar__toast ${toast ? "article-v3-toolbar__toast--show" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast}
      </div>
    </>
  );
}
