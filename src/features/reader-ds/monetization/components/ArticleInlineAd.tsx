"use client";

import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { DismissibleAd } from "../../components/DismissibleAd";

/**
 * In-article display unit (story_in_article). Hidden for premium members.
 * Always labeled विज्ञापन — never styled as editorial.
 */
export function ArticleInlineAd({
  enabled = true,
  label = "विज्ञापन · इनलाइन 300×250",
}: {
  enabled?: boolean;
  label?: string;
}) {
  const { isPremium } = useReaderAccount();
  if (!enabled || isPremium) return null;
  return <DismissibleAd label={label} height={120} />;
}
