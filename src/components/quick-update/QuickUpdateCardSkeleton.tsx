type QuickUpdateCardSkeletonProps = {
  rows?: number;
  variant?: "feed" | "rail";
};

export function QuickUpdateCardSkeleton({
  rows = 5,
  variant = "feed",
}: QuickUpdateCardSkeletonProps) {
  if (variant === "rail") {
    return (
      <div className="quick-update-rail" aria-hidden aria-busy="true">
        <div className="quick-update-rail__track">
          {[1, 2, 3].map((i) => (
            <div key={i} className="quick-update-rail__slot">
              <div className="quick-update quick-update--skeleton quick-update--rail">
                <div className="quick-update__shimmer quick-update__shimmer--meta" />
                <div className="quick-update__shimmer quick-update__shimmer--title" />
                <div className="quick-update__shimmer quick-update__shimmer--line" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="quick-update-feed quick-update-feed--skeleton"
      aria-hidden
      aria-busy="true"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="quick-update quick-update--skeleton">
          <div className="quick-update__shimmer quick-update__shimmer--meta" />
          <div className="quick-update__shimmer quick-update__shimmer--title" />
          <div className="quick-update__shimmer quick-update__shimmer--line" />
        </div>
      ))}
    </div>
  );
}
