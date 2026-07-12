"use client";

import { memo, useCallback } from "react";
import { Share2 } from "lucide-react";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { NewsroomLanguage } from "@/lib/i18n/languages";

type AtlasStoryShareBarProps = {
  title: string;
  url: string;
  language: NewsroomLanguage;
};

export const AtlasStoryShareBar = memo(function AtlasStoryShareBar({
  title,
  url,
  language,
}: AtlasStoryShareBarProps) {
  const label = pickBilingualLabel(language, "Share this story", "यह कहानी शेयर करें");

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

  return (
    <button
      type="button"
      className="atlas-story-share"
      onClick={onShare}
      aria-label={label}
    >
      <Share2 size={20} aria-hidden />
      <span>{label}</span>
    </button>
  );
});
