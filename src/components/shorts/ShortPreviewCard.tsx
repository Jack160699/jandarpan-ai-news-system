"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { PremiumReelCard } from "@/components/cards/PremiumReelCard";
import { ReelItem } from "@/components/shorts/ReelItem";
import type { NewsShortCard } from "@/lib/news/shorts/types";

type ShortPreviewCardProps = {
  short: NewsShortCard;
  active?: boolean;
  onActivate?: () => void;
};

export const ShortPreviewCard = memo(function ShortPreviewCard({
  short,
  active = false,
  onActivate,
}: ShortPreviewCardProps) {
  const router = useRouter();

  return (
    <PremiumReelCard>
      <div
        role="link"
        tabIndex={0}
        className="reel-preview tap-target"
        onClick={() =>
          router.push(`/shorts?start=${encodeURIComponent(short.slug)}`)
        }
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            router.push(`/shorts?start=${encodeURIComponent(short.slug)}`);
          }
        }}
        onFocus={onActivate}
        onMouseEnter={onActivate}
      >
        <ReelItem
          short={short}
          active={active}
          variant="preview"
          onActivate={onActivate}
        />
      </div>
    </PremiumReelCard>
  );
});
