"use client";

import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { ReservedAd } from "../../components/ReservedAd";
import { useJdDsT } from "../../i18n";

/**
 * In-article display unit (story_in_article). Hidden for premium members.
 * Always labeled विज्ञापन — never styled as editorial. Reserved 580×300 on desk.
 */
export function ArticleInlineAd({ enabled = true }: { enabled?: boolean }) {
  const { isPremium } = useReaderAccount();
  const { locale } = useJdDsT();
  if (!enabled || isPremium) return null;
  return (
    <div className="jd-article-inline-ad">
      <ReservedAd format="inline" locale={locale} placementId="article.inline" />
    </div>
  );
}
