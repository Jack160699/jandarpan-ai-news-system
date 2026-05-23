export default function ShortsLoading() {
  return (
    <div
      className="route-loading route-loading--premium reels-page reels-page--loading pl-stagger"
      aria-busy="true"
      aria-label="Loading shorts"
    >
      <div className="reels-page__frame pl-stagger-item">
        <div className="pl-shimmer-block reels-skeleton__media" />
        <div className="reels-skeleton__copy">
          <div className="pl-shimmer-block" style={{ height: "1rem", width: "70%" }} />
          <div
            className="pl-shimmer-block"
            style={{ height: "0.75rem", width: "45%", marginTop: "0.5rem" }}
          />
        </div>
      </div>
    </div>
  );
}
