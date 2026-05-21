"use client";

import { useEffect, useRef } from "react";
import { useLenis } from "@/providers/SmoothScrollProvider";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type ArticleMemoryTrackerProps = {
  slug: string;
  title: string;
};

export function ArticleMemoryTracker({ slug, title }: ArticleMemoryTrackerProps) {
  const ctx = useEditorialIntelligenceOptional();
  const lenis = useLenis();
  const reduced = useReducedMotion();
  const restored = useRef(false);
  const throttle = useRef(0);

  useEffect(() => {
    if (reduced || !ctx) return;

    const saved = ctx.memory.articles[slug];
    if (saved?.scrollY && saved.progress > 0.03 && !restored.current) {
      restored.current = true;
      requestAnimationFrame(() => {
        lenis?.scrollTo(saved.scrollY, { immediate: false, duration: 1.8 });
      });
    }
  }, [ctx, lenis, reduced, slug]);

  useEffect(() => {
    if (reduced || !ctx) return;

    const article = document.querySelector("[data-reading='article']");
    if (!article) return;

    const save = () => {
      const now = Date.now();
      if (now - throttle.current < 400) return;
      throttle.current = now;

      const rect = article.getBoundingClientRect();
      const scrollable = article.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const scrolled = Math.min(Math.max(-rect.top, 0), scrollable);
      const progress = scrolled / scrollable;
      const scrollY = lenis?.scroll ?? window.scrollY;

      ctx.saveArticleProgress(slug, progress, scrollY, title);
    };

    save();
    const unsub = lenis?.on?.("scroll", save);
    window.addEventListener("scroll", save, { passive: true });

    return () => {
      unsub?.();
      window.removeEventListener("scroll", save);
    };
  }, [ctx, lenis, reduced, slug, title]);

  return null;
}
