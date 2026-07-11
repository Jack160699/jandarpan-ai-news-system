"use client";

import { Share2 } from "lucide-react";
import { triggerHaptic } from "@/lib/mobile/haptics";

type FloatingShareProps = {
  url: string;
  title: string;
  onCopy?: () => void;
};

export function FloatingShare({ url, title, onCopy }: FloatingShareProps) {
  const onShare = async () => {
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
      onCopy?.();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="article-v3-floating-share">
      <button
        type="button"
        className="article-v3-floating-share__btn"
        onClick={onShare}
        aria-label="Share article"
      >
        <Share2 size={20} aria-hidden />
      </button>
    </div>
  );
}
