import Link from "next/link";
import type { FooterIntelligence as FooterIntel } from "@/lib/homepage/types";

type FooterTrendingProps = {
  data: FooterIntel;
};

/** Reader-facing trending topics only — no internal metrics */
export function FooterIntelligenceSection({ data }: FooterTrendingProps) {
  if (!data.trendingSearches.length) return null;

  return (
    <section
      className="nr-footer-trending"
      aria-labelledby="nr-footer-trending-title"
    >
      <div className="nr-wrap">
        <h2 id="nr-footer-trending-title" className="nr-footer-trending__title">
          Trending in Chhattisgarh
        </h2>
        <ul className="nr-footer-trending__chips">
          {data.trendingSearches.map((term) => (
            <li key={term}>
              <Link
                href={`/search?q=${encodeURIComponent(term)}`}
                className="nr-footer-trending__chip tap-target"
              >
                {term}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
