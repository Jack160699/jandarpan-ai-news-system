type SectionHeaderProps = {
  id: string;
  title: string;
  titleHi?: string;
  href?: string;
  hrefLabel?: string;
  /** @deprecated — daily layout uses title only */
  kicker?: string;
  description?: string;
};

export function SectionHeader({
  id,
  title,
  titleHi,
  href,
  hrefLabel = "See all",
  description,
}: SectionHeaderProps) {
  return (
    <header className="hp-section-header nr-section__header nr-section__header--daily">
      <div className="hp-section-header__row nr-section__header-row">
        <div className="hp-section-header__text">
          <h2 id={id} className="hp-section-header__title nr-section__title">
            {title}
            {titleHi ? (
              <span className="hp-section-header__title-hi nr-section__title-hi">
                {" "}
                · {titleHi}
              </span>
            ) : null}
          </h2>
          {description ? (
            <p className="hp-section-header__subtitle nr-section__subtitle">
              {description}
            </p>
          ) : null}
        </div>
        {href ? (
          <a href={href} className="hp-section-action nr-section__more tap-target">
            {hrefLabel}
          </a>
        ) : null}
      </div>
    </header>
  );
}
