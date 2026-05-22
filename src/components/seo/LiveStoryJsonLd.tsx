import { liveStoryJsonLd } from "@/lib/news/story-seo";
import type { NewsArticleRow } from "@/lib/types/news-article";

type LiveStoryJsonLdProps = {
  article: NewsArticleRow;
};

export function LiveStoryJsonLd({ article }: LiveStoryJsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(liveStoryJsonLd(article)),
      }}
    />
  );
}
