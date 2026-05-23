type StoryTopicChipsProps = {
  tags?: string[];
  region?: string | null;
  category?: string;
};

export function StoryTopicChips({
  tags = [],
  region,
  category,
}: StoryTopicChipsProps) {
  const chips: Array<{ label: string; variant?: "region" }> = [];

  if (region) {
    chips.push({
      label: region === "chhattisgarh" ? "Chhattisgarh" : region,
      variant: "region",
    });
  }
  if (category) {
    chips.push({ label: category });
  }
  for (const tag of tags.slice(0, 6)) {
    if (tag.trim()) chips.push({ label: tag.trim() });
  }

  if (!chips.length) return null;

  return (
    <ul className="story-topic-chips" aria-label="Topics">
      {chips.map((chip) => (
        <li
          key={chip.label}
          className={`story-topic-chips__chip ${
            chip.variant === "region" ? "story-topic-chips__chip--region" : ""
          }`}
        >
          {chip.label}
        </li>
      ))}
    </ul>
  );
}
