"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type LazyHomeSectionProps = {
  children: ReactNode;
  fallback: ReactNode;
  /** Reserve space to limit CLS (px or css length) */
  minHeight?: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
  /** Load before entering viewport */
  rootMargin?: string;
};

/**
 * Defers mounting heavy below-fold sections until near viewport.
 * Server components can be passed as children.
 */
export function LazyHomeSection({
  children,
  fallback,
  minHeight = "280px",
  id,
  className = "",
  style,
  rootMargin = "280px 0px",
}: LazyHomeSectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!show && node) {
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight + 320) {
        setShow(true);
        return;
      }
    }

    if (!node || show) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShow(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [show, rootMargin]);

  return (
    <div
      ref={rootRef}
      id={id}
      className={`hp-lazy-section feed-section ${className}`.trim()}
      style={{ ...style, minHeight: show ? undefined : minHeight }}
      data-loaded={show ? "true" : "false"}
      aria-busy={show ? undefined : true}
    >
      {show ? (
        <div className="hp-lazy-section__content">{children}</div>
      ) : (
        fallback
      )}
    </div>
  );
}
