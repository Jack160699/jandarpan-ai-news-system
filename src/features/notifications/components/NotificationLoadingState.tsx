"use client";

import { Skeleton } from "@/design-system/components/Skeleton";

export type NotificationLoadingStateProps = {
  label?: string;
};

export function NotificationLoadingState({
  label = "Loading notifications…",
}: NotificationLoadingStateProps) {
  return (
    <div
      className="nc-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      <div className="nc-loading__header">
        <Skeleton variant="text" className="nc-loading__title" />
        <Skeleton variant="text" className="nc-loading__meta" />
      </div>
      <div className="nc-loading__filters">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="nc-loading__chip" />
        ))}
      </div>
      <div className="nc-loading__list">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="nc-loading__card">
            <Skeleton variant="text" className="nc-loading__card-title" />
            <Skeleton variant="text" className="nc-loading__card-body" />
            <Skeleton variant="text" className="nc-loading__card-meta" />
          </div>
        ))}
      </div>
    </div>
  );
}
