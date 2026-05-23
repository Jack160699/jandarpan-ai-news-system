export default function ShortsLoading() {
  return (
    <div
      className="route-loading reels-page reels-page--loading"
      aria-busy="true"
      aria-label="Loading shorts"
    >
      <div className="nr-shimmer h-8 w-32 rounded-full opacity-40" />
    </div>
  );
}
