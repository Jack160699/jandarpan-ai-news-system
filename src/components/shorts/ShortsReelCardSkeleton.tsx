export function ShortsReelCardSkeleton() {
  return (
    <div
      className="shorts-reel-card shorts-reel-card--skeleton"
      aria-hidden
      aria-busy="true"
    >
      <div className="shorts-reel-card__shimmer" />
    </div>
  );
}
