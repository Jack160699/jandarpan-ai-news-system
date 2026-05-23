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
}: SectionHeaderProps) {
  return (
    <header className="nr-section__header nr-section__header--daily">
      <div className="nr-section__header-row">
        <h2 id={id} className="nr-section__title">
          {title}
          {titleHi ? (
            <span className="nr-section__title-hi"> · {titleHi}</span>
          ) : null}
        </h2>
        {href ? (
          <a href={href} className="nr-section__more tap-target">
            {hrefLabel}
          </a>
        ) : null}
      </div>
    </header>
  );
}
