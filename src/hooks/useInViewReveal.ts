"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

type UseInViewRevealOptions = {
  /** IntersectionObserver rootMargin */
  rootMargin?: string;
  /** Fire only once */
  once?: boolean;
  /** Visibility threshold 0–1 */
  threshold?: number;
};

/**
 * Viewport-triggered reveal — toggles `isInView` for motion CSS hooks.
 */
export function useInViewReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewRevealOptions = {}
): [RefObject<T | null>, boolean] {
  const { rootMargin = "0px 0px -6% 0px", once = true, threshold = 0.08 } =
    options;
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsInView(false);
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once, rootMargin, threshold]);

  return [ref, isInView];
}
