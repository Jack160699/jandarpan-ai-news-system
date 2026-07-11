type StoryHighlightsProps = {
  items: string[];
  title: string;
};

export function StoryHighlights({ items, title }: StoryHighlightsProps) {
  if (!items.length) return null;

  return (
    <section
      className="story-highlights story-highlights--premium"
      aria-labelledby="story-highlights-title"
    >
      <h2 id="story-highlights-title" className="story-highlights__title">
        {title}
      </h2>
      <ul className="story-highlights__list">
        {items.map((item, i) => (
          <li key={i} className="story-highlights__item">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
