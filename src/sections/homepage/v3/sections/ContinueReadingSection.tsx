"use client";

import Link from "next/link";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { buttonVariants } from "@/design-system/components/Button";
import { cn } from "@/design-system/utils/cn";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { getContinueTarget } from "@/lib/reading-memory";

export function ContinueReadingSection() {
  const ctx = useEditorialIntelligenceOptional();
  const target = ctx ? getContinueTarget(ctx.memory) : null;

  if (!target) return null;

  const pct = Math.round(target.progress * 100);

  return (
    <section
      className="home-v3__section home-v3__enter"
      aria-labelledby="home-v3-continue-title"
    >
      <SectionHeader title="Continue Reading" kicker="Your place" />
      <h2 id="home-v3-continue-title" className="sr-only">
        Continue Reading
      </h2>

      <div className="home-v3-continue">
        <p className="m-0 font-medium text-[var(--jds-text-body)] text-[var(--jds-color-text-primary)]">
          {target.label}
        </p>
        <div
          className="home-v3-continue__bar"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Reading progress ${pct}%`}
        >
          <div
            className="home-v3-continue__fill"
            style={{ width: `${pct}%` }}
          />
        </div>
        <Link
          href={target.href}
          className={cn(buttonVariants({ variant: "primary" }), "mt-[var(--jds-space-md)] inline-flex")}
        >
          Continue ({pct}%)
        </Link>
      </div>
    </section>
  );
}
