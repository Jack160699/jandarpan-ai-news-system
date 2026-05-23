type SectionHeaderProps = {
  id: string;
  kicker: string;
  title: string;
  titleHi?: string;
  description?: string;
};

export function SectionHeader({
  id,
  kicker,
  title,
  titleHi,
  description,
}: SectionHeaderProps) {
  return (
    <header className="nr-section__header">
      <div>
        <p className="nr-kicker">{kicker}</p>
        <h2 id={id} className="nr-section__title">
          {title}
        </h2>
        {description ? (
          <p className="nr-section__desc">{description}</p>
        ) : null}
      </div>
      {titleHi ? <span className="nr-section__title-hi">{titleHi}</span> : null}
    </header>
  );
}
