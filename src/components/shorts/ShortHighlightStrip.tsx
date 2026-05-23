"use client";

type ShortHighlightStripProps = {
  highlights: string[];
  activeIndex?: number;
};

export function ShortHighlightStrip({
  highlights,
  activeIndex = 0,
}: ShortHighlightStripProps) {
  if (!highlights.length) return null;

  return (
    <ul className="short-highlights" aria-label="Story highlights">
      {highlights.map((text, i) => (
        <li
          key={`${i}-${text.slice(0, 12)}`}
          className={
            i === activeIndex
              ? "short-highlights__item short-highlights__item--active"
              : "short-highlights__item"
          }
        >
          {text}
        </li>
      ))}
    </ul>
  );
}
