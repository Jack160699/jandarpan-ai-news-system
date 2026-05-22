"use client";

import { ReadingProgress } from "@/components/layout/ReadingProgress";

export function StoryReadingProgress() {
  return (
    <ReadingProgress
      target="article"
      className="reading-progress--immersive"
    />
  );
}
