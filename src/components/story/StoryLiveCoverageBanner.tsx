import Link from "next/link";

type StoryLiveCoverageBannerProps = {
  coverageSlug: string;
  coverageHeadline?: string | null;
  sourceCount?: number;
};

export function StoryLiveCoverageBanner({
  coverageSlug,
  coverageHeadline,
  sourceCount,
}: StoryLiveCoverageBannerProps) {
  const label =
    coverageHeadline ??
    `Live updates${sourceCount ? ` · ${sourceCount} sources` : ""}`;

  return (
    <aside className="story-live-banner" aria-label="Live evolving coverage">
      <p className="story-live-banner__text">
        This story is part of an ongoing multi-source cluster.{" "}
        <Link href={`/live/${coverageSlug}`} className="story-live-banner__link">
          {label}
        </Link>
      </p>
    </aside>
  );
}
