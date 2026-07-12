import { CompactCard } from "@/design-system/components/editorial/CompactCard";
import type { SearchHit } from "@/lib/search/types";

type SearchHitCardProps = {
  hit: SearchHit;
  onNavigate?: () => void;
  priority?: boolean;
};

/**
 * @deprecated Legacy search result row — internally renders design-system CompactCard.
 */
export function SearchHitCard({
  hit,
  onNavigate,
  priority = false,
}: SearchHitCardProps) {
  return (
    <li className="search-results__item" role="option">
      <CompactCard
        className="feed-news-card feed-news-card--compact search-feed-card"
        headline={hit.headline}
        excerpt={hit.summary ?? undefined}
        imageUrl={hit.imageUrl ?? undefined}
        imageAlt={hit.headline}
        imageSizes="88px"
        category={hit.section}
        district={hit.district ?? undefined}
        readTime={hit.readingTime ?? undefined}
        href={`/story/${hit.slug}`}
        priority={priority}
        onClick={onNavigate}
      />
    </li>
  );
}
