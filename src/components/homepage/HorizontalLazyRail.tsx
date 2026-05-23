"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type HorizontalLazyRailProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  getKey: (item: T) => string;
  className?: string;
  slotClassName?: string;
  ariaLabel: string;
  initialCount?: number;
  batchSize?: number;
};

/**
 * Progressive horizontal rail — limits DOM + images until scrolled.
 */
export function HorizontalLazyRail<T>({
  items,
  renderItem,
  getKey,
  className = "",
  slotClassName = "",
  ariaLabel,
  initialCount = 5,
  batchSize = 4,
}: HorizontalLazyRailProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(items.length, initialCount)
  );

  const grow = useCallback(() => {
    setVisibleCount((c) => Math.min(items.length, c + batchSize));
  }, [items.length, batchSize]);

  useEffect(() => {
    setVisibleCount(Math.min(items.length, initialCount));
  }, [items.length, initialCount]);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || visibleCount >= items.length) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) grow();
      },
      { root, rootMargin: "120px", threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [grow, items.length, visibleCount]);

  const slice = items.slice(0, visibleCount);

  return (
    <div
      ref={scrollRef}
      className={className}
      role="list"
      aria-label={ariaLabel}
    >
      {slice.map((item, index) => (
        <div
          key={getKey(item)}
          role="listitem"
          className={slotClassName}
        >
          {renderItem(item, index)}
        </div>
      ))}
      {visibleCount < items.length ? (
        <div ref={sentinelRef} className="hp-rail-sentinel" aria-hidden />
      ) : null}
    </div>
  );
}
