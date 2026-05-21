"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  getCuriosityTrail,
  getTrailForHomepage,
  type CuriosityStep,
} from "@/lib/story-trails";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { SectionLabel } from "@/components/ui/SectionLabel";

type CuriosityTrailProps = {
  currentSlug?: string;
  variant?: "home" | "article";
  title?: string;
};

export function CuriosityTrail({
  currentSlug,
  variant = "article",
  title = "Where readers go next",
}: CuriosityTrailProps) {
  const ctx = useEditorialIntelligenceOptional();

  const steps: CuriosityStep[] = useMemo(() => {
    if (!ctx) return [];
    return variant === "home"
      ? getTrailForHomepage(ctx.memory)
      : getCuriosityTrail(ctx.memory, currentSlug);
  }, [ctx, variant, currentSlug]);

  if (!steps.length) return null;

  return (
    <aside className="curiosity-trail editorial-container section-pad-tight">
      <SectionLabel variant="muted">{title}</SectionLabel>
      <p className="deck mt-4 max-w-md text-[var(--ink-muted)]">
        Not recommendations — editorial trails, filed by the desk.
      </p>
      <div className="mt-10">
        {steps.map((step) => (
          <div key={`${step.slug}-${step.kicker}`} className="curiosity-trail__step">
            <span className="meta-label text-[var(--ink-faint)]">{step.kicker}</span>
            <Link
              href={`/story/${step.slug}`}
              className="story-link mt-2 block headline-sm max-w-[24ch]"
            >
              {step.title}
            </Link>
            <p className="editorial-body mt-4 max-w-prose text-[var(--ink-secondary)]">
              {step.reason}
            </p>
          </div>
        ))}
      </div>
    </aside>
  );
}
