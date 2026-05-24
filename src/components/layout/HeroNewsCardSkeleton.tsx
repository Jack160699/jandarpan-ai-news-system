/**
 * Featured hero skeleton — fixed 16:9 media prevents layout shift
 */
export function HeroNewsCardSkeleton() {
  return (
    <section
      className="hero-news-card hero-news-card--premium hero-news-card--skeleton"
      aria-hidden
      aria-busy="true"
    >
      <article className="hero-news-card__article hero-news-card__article--premium">
        <div className="hero-news-card__media-stack">
          <div className="hero-news-card__visual hero-news-card__visual--premium hero-news-card__shimmer" />
          <div className="hero-news-card__float-top">
            <div className="hero-news-card__shimmer hero-news-card__shimmer--badge" />
          </div>
        </div>
        <div className="hero-news-card__body">
          <div className="hero-news-card__shimmer hero-news-card__shimmer--headline" />
          <div className="hero-news-card__shimmer hero-news-card__shimmer--headline hero-news-card__shimmer--headline-short" />
          <div className="hero-news-card__shimmer hero-news-card__shimmer--summary" />
          <div className="hero-news-card__shimmer hero-news-card__shimmer--meta" />
        </div>
        <div className="hero-card-actions hero-card-actions--skeleton" aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="hero-card-actions__btn hero-news-card__shimmer hero-news-card__shimmer--action"
            />
          ))}
        </div>
      </article>
    </section>
  );
}
