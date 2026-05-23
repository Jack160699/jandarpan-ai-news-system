/**
 * Reels manifest — vertical slide timeline for mobile autoplay
 */

import type { ReelSlide, SubtitleCue } from "@/lib/news/shorts/types";

export function buildReelSlides(input: {
  headline: string;
  highlights: string[];
  imageUrl: string;
  subtitles: SubtitleCue[];
  durationSec: number;
}): ReelSlide[] {
  const totalMs = input.durationSec * 1000;
  const slides: ReelSlide[] = [];

  if (input.subtitles.length >= 2) {
    for (let i = 0; i < input.subtitles.length; i++) {
      const cue = input.subtitles[i];
      slides.push({
        id: `slide-${i}`,
        startMs: cue.startMs,
        endMs: cue.endMs,
        headline: i === 0 ? input.headline : input.highlights[i % input.highlights.length] ?? input.headline,
        caption: cue.text,
        imageUrl: input.imageUrl,
        highlight: input.highlights[i] ?? undefined,
      });
    }
    return slides;
  }

  const chunk = Math.floor(totalMs / Math.max(1, input.highlights.length || 3));
  const parts = input.highlights.length
    ? input.highlights
    : [input.headline, input.headline];

  parts.forEach((text, i) => {
    const startMs = i * chunk;
    const endMs = i === parts.length - 1 ? totalMs : (i + 1) * chunk;
    slides.push({
      id: `slide-${i}`,
      startMs,
      endMs,
      headline: i === 0 ? input.headline : input.headline,
      caption: text,
      imageUrl: input.imageUrl,
      highlight: text,
    });
  });

  return slides;
}
