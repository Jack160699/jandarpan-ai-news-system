import type { TrendAcceleration } from "@/lib/intelligence/types";

export function detectTrendAcceleration(
  items: Array<{ created_at: string; headline: string; tags?: string[] }>
): TrendAcceleration[] {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  const buckets = new Map<string, { h1: number; h6: number; h24: number; headlines: string[] }>();

  for (const item of items) {
    const age = now - new Date(item.created_at).getTime();
    const topic = extractTopicKey(item);
    const b = buckets.get(topic) ?? { h1: 0, h6: 0, h24: 0, headlines: [] };

    if (age <= hourMs) b.h1 += 1;
    if (age <= 6 * hourMs) b.h6 += 1;
    if (age <= 24 * hourMs) b.h24 += 1;
    if (b.headlines.length < 3) b.headlines.push(item.headline);
    buckets.set(topic, b);
  }

  const results: TrendAcceleration[] = [];

  for (const [topic, b] of buckets) {
    const velocity1h = b.h1;
    const velocity6h = b.h6 / 6;
    const acceleration = velocity1h - velocity6h;
    const score = Math.min(1, (b.h1 * 0.4 + acceleration * 0.35 + b.h24 * 0.02) / 3);

    if (b.h24 < 2 && score < 0.2) continue;

    results.push({
      topic,
      acceleration: Math.round(acceleration * 100) / 100,
      velocity1h,
      velocity6h: Math.round(velocity6h * 100) / 100,
      score,
      alert: score >= 0.55 || (acceleration > 1.5 && velocity1h >= 2),
      sampleHeadlines: b.headlines,
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 12);
}

function extractTopicKey(item: {
  headline: string;
  tags?: string[];
}): string {
  if (item.tags?.[0]) return item.tags[0].toLowerCase();
  const words = item.headline
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  return words.slice(0, 2).join("-") || "general";
}
