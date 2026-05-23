import Link from "next/link";

type TrendingKeywordsBarProps = {
  keywords: string[];
};

export function TrendingKeywordsBar({ keywords }: TrendingKeywordsBarProps) {
  if (!keywords.length) return null;

  return (
    <div className="trending-keywords" aria-label="Trending topics">
      <span className="trending-keywords__label">Trending</span>
      <ul className="trending-keywords__list">
        {keywords.slice(0, 8).map((kw) => (
          <li key={kw}>
            <Link
              href={`/search?q=${encodeURIComponent(kw)}`}
              className="trending-keywords__chip"
            >
              {kw}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
