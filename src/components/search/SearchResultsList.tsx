import Link from "next/link";
import Image from "next/image";
import { IMAGE_BLUR } from "@/lib/image-placeholder";
import type { SearchHit } from "@/lib/search/types";

type SearchResultsListProps = {
  hits: SearchHit[];
};

export function SearchResultsList({ hits }: SearchResultsListProps) {
  if (!hits.length) return null;

  return (
    <ul className="search-results mt-8">
      {hits.map((hit) => (
        <li key={hit.id}>
          <Link href={`/story/${hit.slug}`} className="search-hit group">
            {hit.imageUrl ? (
              <div className="search-hit__thumb">
                <Image
                  src={hit.imageUrl}
                  alt=""
                  fill
                  sizes="72px"
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL={IMAGE_BLUR}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="search-hit__thumb bg-[var(--paper-muted)]" />
            )}
            <div>
              <p className="search-hit__headline">{hit.headline}</p>
              {hit.summary ? (
                <p className="search-hit__summary">{hit.summary}</p>
              ) : null}
              <p className="search-hit__meta">
                {hit.section}
                {hit.district ? ` · ${hit.district}` : ""}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
