import { articleJsonLd } from "@/lib/seo";
import type { Article } from "@/lib/articles";

type ArticleJsonLdProps = {
  article: Article;
};

export function ArticleJsonLd({ article }: ArticleJsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(articleJsonLd(article)),
      }}
    />
  );
}
