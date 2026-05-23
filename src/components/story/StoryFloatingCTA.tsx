"use client";

type StoryFloatingCTAProps = {
  shareUrl: string;
  shareTitle: string;
  shortsHref?: string;
  liveHref?: string;
};

export function StoryFloatingCTA({
  shareUrl,
  shareTitle,
  shortsHref = "/shorts",
  liveHref = "/#breaking",
}: StoryFloatingCTAProps) {
  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${shareTitle} ${shareUrl}`)}`;

  return (
    <div className="story-float-cta" aria-label="Quick actions">
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="story-float-cta__btn story-float-cta__btn--wa tap-target"
        aria-label="Share on WhatsApp"
      >
        <span className="story-float-cta__icon" aria-hidden>
          WA
        </span>
      </a>
      <a
        href={liveHref}
        className="story-float-cta__btn story-float-cta__btn--live tap-target"
        aria-label="Watch live coverage"
      >
        <span className="story-float-cta__icon" aria-hidden>
          ▶
        </span>
        <span className="story-float-cta__label">Live</span>
      </a>
      <a
        href={shortsHref}
        className="story-float-cta__btn story-float-cta__btn--shorts tap-target"
        aria-label="Watch news shorts"
      >
        <span className="story-float-cta__icon" aria-hidden>
          60s
        </span>
        <span className="story-float-cta__label">Reels</span>
      </a>
    </div>
  );
}
