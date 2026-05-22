import Link from "next/link";
import { HomeArticleImage } from "@/components/homepage/HomeArticleImage";
import type { RegionalSectionBlock } from "@/lib/homepage/types";

type RegionalSectionsProps = {
  sections: RegionalSectionBlock[];
};

export function RegionalSections({ sections }: RegionalSectionsProps) {
  const blocks = sections.filter((s) => s.articles.length > 0);
  if (!blocks.length) return null;

  return (
    <section className="hp__section" aria-labelledby="hp-regional-title">
      <div className="hp__inner">
        <div className="hp__title-row">
          <div>
            <p className="hp__kicker">Regions & desks</p>
            <h2 id="hp-regional-title" className="hp__title">
              From across the state
            </h2>
          </div>
          <span className="hp__title-hi">क्षेत्रीय खबरें</span>
        </div>

        <div className="hp-regional__grid">
          {blocks.map((block) => (
            <div key={block.id} className="hp-regional__block">
              <h3 className="hp__title" style={{ fontSize: "1.25rem" }}>
                {block.label}
                <span className="hp__title-hi ml-2 font-normal">
                  {block.labelHi}
                </span>
              </h3>
              <ul className="hp-regional__list">
                {block.articles.map((article) => (
                  <li key={article.id} className="hp-regional__item">
                    <Link href={`/story/${article.slug}`}>
                      <div className="hp-regional__thumb">
                        <HomeArticleImage
                          src={article.imageUrl}
                          alt=""
                          sizes="88px"
                        />
                      </div>
                      <div>
                        <p className="hp-regional__headline">{article.headline}</p>
                        <p className="mt-1 font-[family-name:var(--font-ui)] text-xs text-[var(--ink-muted)]">
                          {article.readingTime}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
