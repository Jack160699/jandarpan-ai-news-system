type StoryWhyThisMattersProps = {
  text: string;
  title: string;
};

export function StoryWhyThisMatters({ text, title }: StoryWhyThisMattersProps) {
  return (
    <section
      className="story-editorial-intel__why"
      aria-labelledby="story-why-title"
    >
      <h2 id="story-why-title" className="story-editorial-intel__section-title">
        {title}
      </h2>
      <p className="story-editorial-intel__why-text">{text}</p>
    </section>
  );
}
