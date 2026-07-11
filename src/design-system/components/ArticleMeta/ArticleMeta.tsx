import * as React from "react";
import { cn } from "@/design-system/utils/cn";

export type ArticleMetaVariant = "default" | "feed";

export interface ArticleMetaProps extends React.HTMLAttributes<HTMLDivElement> {
  author?: string;
  publishedAt?: string;
  publishedAtIso?: string;
  updatedAt?: string;
  readTime?: string;
  source?: string;
  district?: string;
  category?: string;
  confidence?: number;
  /** `feed` emits legacy feed-news-card class names for CSS compatibility. */
  variant?: ArticleMetaVariant;
}

type MetaItem =
  | { type: "author"; label: string }
  | { type: "time"; label: string; dateTime?: string }
  | { type: "text"; label: string; kind?: "category" | "source" | "default" };

/** Shared metadata row for editorial cards — reading time, district, source, confidence. */
export const ArticleMeta = React.forwardRef<HTMLDivElement, ArticleMetaProps>(
  (
    {
      className,
      author,
      publishedAt,
      publishedAtIso,
      updatedAt,
      readTime,
      source,
      district,
      category,
      confidence,
      variant = "default",
      ...props
    },
    ref
  ) => {
    const isFeed = variant === "feed";
    const rootClass = isFeed ? "feed-news-card__meta" : "jds-article-meta";
    const sepClass = isFeed ? "feed-news-card__meta-sep" : "jds-article-meta__sep";

    const items: MetaItem[] = [];

    if (author) items.push({ type: "author", label: author });
    if (publishedAt) {
      items.push({
        type: "time",
        label: publishedAt,
        dateTime: publishedAtIso,
      });
    }
    if (updatedAt) items.push({ type: "text", label: updatedAt });
    if (category) items.push({ type: "text", label: category, kind: "category" });
    if (district) items.push({ type: "text", label: district });
    if (readTime) items.push({ type: "text", label: readTime });
    if (source) items.push({ type: "text", label: source, kind: "source" });
    if (typeof confidence === "number" && confidence > 0) {
      items.push({
        type: "text",
        label: `${confidence}% confidence`,
        kind: "default",
      });
    }

    if (items.length === 0) return null;

    function textClass(kind?: "category" | "source" | "default"): string | undefined {
      if (!isFeed || kind === "default" || !kind) return undefined;
      if (kind === "category") return "feed-news-card__meta-category";
      if (kind === "source") return "feed-news-card__meta-source";
      return undefined;
    }

    return (
      <div ref={ref} className={cn(rootClass, className)} {...props}>
        {items.map((item, i) => (
          <React.Fragment key={`${item.type}-${i}`}>
            {i > 0 ? (
              <span className={sepClass} aria-hidden>
                ·
              </span>
            ) : null}
            {item.type === "time" ? (
              <time dateTime={item.dateTime}>{item.label}</time>
            ) : (
              <span
                className={
                  item.type === "text"
                    ? textClass(item.kind) ??
                      (item.kind === "default" && !isFeed
                        ? "jds-article-meta__confidence"
                        : undefined)
                    : undefined
                }
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }
);
ArticleMeta.displayName = "ArticleMeta";
