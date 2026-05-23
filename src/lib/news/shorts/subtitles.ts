/**
 * Auto subtitle generation — timed cues from anchor script
 */

import type { SubtitleCue } from "@/lib/news/shorts/types";

const TARGET_DURATION_MS = 60_000;

function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

export function generateSubtitlesFromScript(
  script: string,
  durationSec = 60
): SubtitleCue[] {
  const sentences = splitSentences(script);
  if (!sentences.length) {
    return [
      {
        id: "cue-0",
        startMs: 0,
        endMs: durationSec * 1000,
        text: script.slice(0, 120),
      },
    ];
  }

  const totalMs = Math.min(TARGET_DURATION_MS, durationSec * 1000);
  const weights = sentences.map((s) => Math.max(8, s.length));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  let cursor = 0;
  const cues: SubtitleCue[] = [];

  sentences.forEach((text, i) => {
    const sliceMs = Math.round((weights[i] / weightSum) * totalMs);
    const startMs = cursor;
    const endMs =
      i === sentences.length - 1 ? totalMs : Math.min(totalMs, cursor + sliceMs);
    cursor = endMs;
    cues.push({
      id: `cue-${i}`,
      startMs,
      endMs,
      text,
    });
  });

  return cues;
}

export function subtitleAtTime(
  cues: SubtitleCue[],
  timeMs: number
): SubtitleCue | null {
  return cues.find((c) => timeMs >= c.startMs && timeMs < c.endMs) ?? null;
}
