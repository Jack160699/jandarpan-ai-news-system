"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { focusRingClass } from "@/design-system/utils/aria";
import { cn } from "@/lib/cn";
import type { NewsShortCard } from "@/lib/news/shorts/types";
import { useLanguage } from "@/providers/LanguageProvider";

type ReelShareProps = {
  short: NewsShortCard;
  className?: string;
};

async function shareShort(short: NewsShortCard): Promise<void> {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/shorts?start=${short.slug}`
      : `/shorts?start=${short.slug}`;
  const payload = {
    title: short.headline,
    text: short.summary60s.slice(0, 120),
    url,
  };
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(payload);
      return;
    } catch {
      /* fall through */
    }
  }
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
  }
}

/**
 * JDP-017 — Native share or clipboard fallback
 */
export function ReelShare({ short, className }: ReelShareProps) {
  const { t } = useLanguage();
  const [done, setDone] = useState(false);

  const handleShare = () => {
    void shareShort(short).then(() => {
      setDone(true);
      window.setTimeout(() => setDone(false), 2000);
    });
  };

  return (
    <button
      type="button"
      className={cn(
        "reels-v3-action tap-target",
        done && "reels-v3-action--on",
        focusRingClass,
        className
      )}
      onClick={handleShare}
      aria-label={done ? t.common.copyLink : t.shorts.share}
    >
      <span className="reels-v3-action__icon" aria-hidden>
        <Share2 size={22} strokeWidth={2} />
      </span>
    </button>
  );
}
