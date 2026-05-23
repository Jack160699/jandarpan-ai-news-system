import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { liveStoryJsonLd } from "@/lib/news/story-seo";
import type { EditorialImageMeta } from "@/lib/types/newsroom";
import type { NewsArticleRow } from "@/lib/types/news-article";

type LiveStoryJsonLdProps = {
  article: NewsArticleRow;
  imageMeta?: EditorialImageMeta | null;
};

export function LiveStoryJsonLd({ article, imageMeta }: LiveStoryJsonLdProps) {
  return <JsonLdScript data={liveStoryJsonLd(article, { imageMeta })} />;
}
