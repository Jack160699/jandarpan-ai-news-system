"use client";

import { memo, useCallback, useState, type ReactNode } from "react";
import { AtlasReadingProgress } from "./AtlasReadingProgress";
import { AtlasStoryHeader } from "./AtlasStoryHeader";

type AtlasStoryReadingChromeProps = {
  slug: string;
  title: string;
  url: string;
  children: ReactNode;
};

export const AtlasStoryReadingChrome = memo(function AtlasStoryReadingChrome({
  slug,
  title,
  url,
  children,
}: AtlasStoryReadingChromeProps) {
  const [progress, setProgress] = useState(0);
  const onProgress = useCallback((ratio: number) => {
    setProgress(ratio);
  }, []);

  return (
    <>
      <AtlasReadingProgress onProgress={onProgress} />
      <AtlasStoryHeader slug={slug} title={title} url={url} progress={progress} />
      <div data-reading="story-atlas">{children}</div>
    </>
  );
});
