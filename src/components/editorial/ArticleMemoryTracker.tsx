"use client";

import { useEffect, useRef } from "react";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type ArticleMemoryTrackerProps = {
  slug: string;
  title: string;
};

export function ArticleMemoryTracker({ slug, title }: ArticleMemoryTrackerProps) {
  const ctx = useEditorialIntelligenceOptional();
  const reduced = useReducedMotion();
  const restored = useRef(false);
  const throttle = useRef(0);

  useEffect(() => {
    if (reduced || !ctx) return;

    const saved = ctx.memory.articles[slug];
    if (saved?.scrollY && saved.progress > 0.03 && !restored.current) {
      restored.current = true;
      requestAnimationFrame(() => {
        window.scrollTo({ top: saved.scrollY, behavior: "auto" });
      });
    }
  }, [ctx, reduced, slug]);

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

      ctx.saveArticleProgress(slug, progress, window.scrollY, title);
    };

    save();
    window.addEventListener("scroll", save, { passive: true });

    return () => window.removeEventListener("scroll", save);
  }, [ctx, reduced, slug, title]);

  return null;
}
