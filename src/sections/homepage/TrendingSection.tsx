import Link from "next/link";
import type { HomeArticle } from "@/lib/homepage/types";

type TrendingSectionProps = {
  articles: HomeArticle[];
};

export function TrendingSection({ articles }: TrendingSectionProps) {
  if (!articles.length) return null;

  return (
    <section className="hp__section" aria-labelledby="hp-trending-title">
      <div className="hp__inner">
        <div className="hp__title-row">
          <div>
            <p className="hp__kicker">AI-ranked · Most read</p>
            <h2 id="hp-trending-title" className="hp__title">
              Trending now
            </h2>
          </div>
          <span className="hp__title-hi">ट्रेंडिंग</span>
        </div>

        <ol className="hp-trending__list">
          {articles.map((article) => (
            <li key={article.id} className="hp-trending__item">
              <Link href={`/story/${article.slug}`}>
                <div>
                  <p className="font-[family-name:var(--font-display)] text-lg font-semibold leading-snug text-[var(--ink-headline)]">
                    {article.headline}
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-ui)] text-xs text-[var(--ink-muted)]">
                    {article.section} · {article.readingTime}
                  </p>
                </div>
                <span className="hp-trending__score">
                  {article.ranking.isTrending ? "Trending · " : ""}
                  {article.priorityScore.toFixed(0)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
