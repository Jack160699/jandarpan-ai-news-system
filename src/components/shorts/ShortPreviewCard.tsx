"use client";

import { memo } from "react";
import { ShortsReelCard } from "@/components/shorts/ShortsReelCard";
import type { NewsShortCard } from "@/lib/news/shorts/types";

type ShortPreviewCardProps = {
  short: NewsShortCard;
  active?: boolean;
  index?: number;
  onActivate?: () => void;
};

/** Homepage / rail preview — delegates to cinematic ShortsReelCard */
export const ShortPreviewCard = memo(function ShortPreviewCard({
  short,
  active = false,
  index = 0,
  onActivate,
}: ShortPreviewCardProps) {
  return (
    <ShortsReelCard
      short={short}
      active={active}
      index={index}
      onActivate={onActivate}
    />
  );
});
