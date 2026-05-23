"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { ReelChrome } from "@/components/shorts/ReelChrome";
import { ShortsVerticalFeed } from "@/components/shorts/ShortsVerticalFeed";
import type { NewsShortCard } from "@/lib/news/shorts/types";

type ShortsReelsShellProps = {
  shorts: NewsShortCard[];
};

export function ShortsReelsShell({ shorts }: ShortsReelsShellProps) {
  const searchParams = useSearchParams();
  const start = searchParams.get("start") ?? undefined;
  const [activeIndex, setActiveIndex] = useState(0);
  const [chromeHidden, setChromeHidden] = useState(false);

  const onActiveIndexChange = useCallback((index: number) => {
    setActiveIndex(index);
    setChromeHidden(false);
  }, []);

  return (
    <div className="reels-page reels-page--immersive">
      <ReelChrome
        total={shorts.length}
        activeIndex={activeIndex}
        hidden={chromeHidden}
      />
      <ShortsVerticalFeed
        shorts={shorts}
        initialSlug={start}
        onActiveIndexChange={onActiveIndexChange}
      />
    </div>
  );
}
