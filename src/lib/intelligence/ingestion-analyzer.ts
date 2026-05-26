import type { LiveSignalFeedItem } from "@/lib/intelligence/types";
import { analyzeSentiment } from "@/lib/intelligence/sentiment-analysis";
import { scorePoliticalSensitivity } from "@/lib/intelligence/political-sensitivity";
import { scoreFakeNewsRisk } from "@/lib/intelligence/fake-news-risk";

export type RawSignal = {
  id: string;
  title: string;
  provider: string;
  source: string | null;
  region: string | null;
  category: string | null;
  published_at: string | null;
  created_at: string;
  article_url: string;
};

export function analyzeLiveSignals(signals: RawSignal[]): LiveSignalFeedItem[] {
  return signals.map((s) => {
    const text = s.title;
    const sentiment = analyzeSentiment(text);
    const political = scorePoliticalSensitivity(text);
    const misinfo = scoreFakeNewsRisk({
      headline: s.title,
      summary: "",
      sourceCount: 1,
    });

    const breakingProbability = Math.min(
      1,
      (misinfo.score < 0.4 ? 0.2 : 0) +
        (sentiment.label === "negative" ? 0.15 : 0) +
        (/\b(breaking|urgent|live|ताजा|ब्रेकिंग)\b/i.test(text) ? 0.35 : 0) +
        0.1
    );

    return {
      signalId: s.id,
      title: s.title,
      provider: s.provider,
      source: s.source,
      region: s.region,
      category: s.category,
      publishedAt: s.published_at,
      ingestedAt: s.created_at,
      misinfoRisk: misinfo.score,
      sentiment: sentiment.label,
      politicalSensitivity: political.score,
      breakingProbability,
      articleUrl: s.article_url,
    };
  });
}
