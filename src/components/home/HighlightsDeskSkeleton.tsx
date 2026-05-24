/**
 * Slim homepage highlights placeholder — no faux ad / section kicker blocks.
 */

export function HighlightsDeskSkeleton() {
  return (
    <div className="highlights-desk-skeleton" aria-hidden>
      <div className="highlights-desk-skeleton__title" />
      <div className="highlights-desk-skeleton__grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="highlights-desk-skeleton__card" />
        ))}
      </div>
      <div className="highlights-desk-skeleton__feed">
        {[1, 2, 3].map((i) => (
          <div key={i} className="highlights-desk-skeleton__row" />
        ))}
      </div>
    </div>
  );
}
