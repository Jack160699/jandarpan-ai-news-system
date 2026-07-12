"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type LazyV3SectionProps = {
  children: ReactNode;
  fallback: ReactNode;
  minHeight?: string;
  id?: string;
  className?: string;
};

/** Intersection Observer lazy mount for below-fold V3 sections */
export function LazyV3Section({
  children,
  fallback,
  minHeight = "240px",
  id,
  className = "",
}: LazyV3SectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || show) return;

    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight + 200) {
      setShow(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShow(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [show]);

  return (
    <div
      ref={ref}
      id={id}
      className={`home-v31-lazy ${className}`.trim()}
      style={{ minHeight: show ? undefined : minHeight }}
      aria-busy={show ? undefined : true}
    >
      {show ? children : fallback}
    </div>
  );
}
