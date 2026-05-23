import Link from "next/link";
import type { FooterIntelligence as FooterIntel } from "@/lib/homepage/types";

type FooterIntelligenceProps = {
  data: FooterIntel;
};

export function FooterIntelligenceSection({ data }: FooterIntelligenceProps) {
  const updated = new Date(data.fetchedAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

  return (
    <section
      className="nr-intel"
      aria-labelledby="nr-intel-title"
    >
      <div className="nr-wrap">
        <h2 id="nr-intel-title" className="nr-kicker">
          Newsroom intelligence
        </h2>
        <div className="nr-intel__grid">
          <div className="nr-intel__stat">
            <span className="nr-intel__value">{data.storyCount}</span>
            <span className="nr-intel__label">Stories indexed</span>
          </div>
          <div className="nr-intel__stat">
            <span className="nr-intel__value">{data.breakingCount}</span>
            <span className="nr-intel__label">Breaking signals</span>
          </div>
          <div className="nr-intel__stat">
            <span className="nr-intel__value">{data.trendingCount}</span>
            <span className="nr-intel__label">Trending now</span>
          </div>
          <div className="nr-intel__stat">
            <span className="nr-intel__value">
              {Math.round(data.avgConfidence * 100)}%
            </span>
            <span className="nr-intel__label">Avg desk confidence</span>
          </div>
        </div>

        {data.trendingSearches.length > 0 ? (
          <div className="nr-intel__searches">
            <p className="nr-meta">Popular searches</p>
            <ul className="nr-intel__chips">
              {data.trendingSearches.map((term) => (
                <li key={term}>
                  <Link
                    href={`/search?q=${encodeURIComponent(term)}`}
                    className="nr-intel__chip"
                  >
                    {term}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="nr-intel__updated">
          Edition refreshed {updated} · AI-edited regional newsroom
        </p>
      </div>
    </section>
  );
}
