import Link from "next/link";

type StoryInlineBreakingProps = {
  headline: string;
  href: string;
  sourceCount?: number;
};

export function StoryInlineBreaking({
  headline,
  href,
  sourceCount,
}: StoryInlineBreakingProps) {
  return (
    <aside className="story-inline-breaking" aria-label="Live breaking coverage">
      <div className="story-inline-breaking__badge">
        <span className="story-inline-breaking__dot" aria-hidden />
        Breaking · Live desk
      </div>
      <p className="story-inline-breaking__headline">{headline}</p>
      {sourceCount && sourceCount > 1 ? (
        <p className="story-inline-breaking__meta">
          {sourceCount} sources tracking
        </p>
      ) : null}
      <Link href={href} className="story-inline-breaking__cta tap-target">
        Follow live updates →
      </Link>
    </aside>
  );
}
