import { Skeleton } from "@/design-system/components/Skeleton";

export function ProfileV3Skeleton() {
  return (
    <div className="pv3-skeleton" aria-busy="true" aria-label="Loading profile">
      <div className="pv3-skeleton__hero">
        <Skeleton variant="text" className="pv3-skeleton__back" />
        <Skeleton variant="title" className="pv3-skeleton__title" />
        <Skeleton variant="text" className="pv3-skeleton__subtitle" />
      </div>

      <div className="pv3-skeleton__layout">
        <div className="pv3-skeleton__nav" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="text" className="pv3-skeleton__nav-item" />
          ))}
        </div>

        <div className="pv3-skeleton__sections" aria-hidden>
          <div className="pv3-skeleton__card">
            <Skeleton variant="avatar" />
            <div className="pv3-skeleton__card-text">
              <Skeleton variant="title" />
              <Skeleton variant="text" />
              <Skeleton variant="text" className="pv3-skeleton__short" />
            </div>
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="pv3-skeleton__card pv3-skeleton__card--block">
              <Skeleton variant="title" className="pv3-skeleton__section-title" />
              <Skeleton variant="text" />
              <Skeleton variant="text" />
              <Skeleton variant="text" className="pv3-skeleton__short" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
