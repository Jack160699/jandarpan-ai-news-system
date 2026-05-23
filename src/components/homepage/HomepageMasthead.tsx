type HomepageMastheadProps = {
  fetchedAt?: string;
  brandName?: string;
};

function formatEditionDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function HomepageMasthead({
  fetchedAt,
  brandName = "CG Bhaskar",
}: HomepageMastheadProps) {
  return (
    <header id="top-news" className="nr-masthead nr-wrap scroll-mt-24">
      <div className="nr-masthead__row">
        <div>
          <p className="nr-masthead__tagline">Chhattisgarh · India · World</p>
          <h1 className="nr-masthead__brand">{brandName}</h1>
        </div>
        <div className="nr-masthead__edition">
          <strong>Digital edition</strong>
          <time dateTime={fetchedAt ?? new Date().toISOString()}>
            {formatEditionDate(fetchedAt)}
          </time>
        </div>
      </div>
    </header>
  );
}
