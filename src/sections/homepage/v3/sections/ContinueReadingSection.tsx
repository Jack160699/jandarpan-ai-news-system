"use client";

import Link from "next/link";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { buttonVariants } from "@/design-system/components/Button";
import { cn } from "@/design-system/utils/cn";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { getContinueTarget } from "@/lib/reading-memory";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";

export function ContinueReadingSection() {
  const { language } = useLanguage();
  const ctx = useEditorialIntelligenceOptional();
  const target = ctx ? getContinueTarget(ctx.memory) : null;

  if (!target) return null;

  const pct = Math.round(target.progress * 100);

  return (
    <section
      className="home-v31__section home-v31__enter"
      aria-labelledby="home-v31-continue-title"
    >
      <SectionHeader
        title={pickBilingualLabel(language, "Continue Reading", "पढ़ना जारी रखें")}
        kicker={pickBilingualLabel(language, "Your place", "आपकी जगह")}
      />
      <h2 id="home-v31-continue-title" className="sr-only">
        Continue Reading
      </h2>

      <div className="home-v31-continue">
        <p className="home-v31-continue__label">{target.label}</p>
        <div
          className="home-v31-continue__bar"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pickBilingualLabel(language, "Reading progress", "पढ़ने की प्रगति")} ${pct}%`}
        >
          <div
            className="home-v31-continue__fill"
            style={{ width: `${pct}%` }}
          />
        </div>
        <Link
          href={target.href}
          className={cn(
            buttonVariants({ variant: "primary", size: "md" }),
            "home-v31-continue__cta"
          )}
        >
          {pickBilingualLabel(language, "Continue", "जारी रखें")} ({pct}%)
        </Link>
      </div>
    </section>
  );
}
