"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type StoryReadHelpersProps = {
  readTime: string;
};

/** Subtle scroll-to-top control for long-form reading */
export function StoryReadHelpers({ readTime }: StoryReadHelpersProps) {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  return (
    <button
      type="button"
      className={`story-scroll-top tap-target${visible ? " story-scroll-top--visible" : ""}`}
      onClick={scrollToTop}
      aria-label="Back to top"
      title={`Back to top · ${readTime}`}
    >
      <span aria-hidden>↑</span>
    </button>
  );
}
