import type { EditorialIntelligenceVm } from "@/lib/story/editorial-intelligence";

type StoryQualityBadgesProps = {
  badges: EditorialIntelligenceVm["qualityBadges"];
};

export function StoryQualityBadges({ badges }: StoryQualityBadgesProps) {
  if (!badges.length) return null;

  return (
    <ul className="story-editorial-intel__badges" aria-label="Editorial quality">
      {badges.map((badge) => (
        <li key={badge.id}>
          <span className="story-editorial-intel__badge">{badge.label}</span>
        </li>
      ))}
    </ul>
  );
}
