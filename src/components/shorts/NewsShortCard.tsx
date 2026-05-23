"use client";

import { ReelItem } from "@/components/shorts/ReelItem";
import type { NewsShortCard } from "@/lib/news/shorts/types";

type NewsShortCardProps = {
  short: NewsShortCard;
  autoplay?: boolean;
  active?: boolean;
  onActivate?: () => void;
};

/** @deprecated Prefer ReelItem or ShortPreviewCard — kept for existing imports */
export function NewsShortCard({
  short,
  autoplay = true,
  active = false,
  onActivate,
}: NewsShortCardProps) {
  return (
    <ReelItem
      short={short}
      active={autoplay ? active : false}
      variant="preview"
      onActivate={onActivate}
    />
  );
}
