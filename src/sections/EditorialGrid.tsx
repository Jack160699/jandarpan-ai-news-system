"use client";

import Link from "next/link";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Rule } from "@/components/ui/Rule";
import { IncompleteReveal } from "@/components/motion/IncompleteReveal";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { EDITORIAL_STORIES } from "@/lib/editorial-stories";

export function EditorialGrid() {
  return (
    <section
      id="editorial"
      className="section-pad border-t border-[var(--rule)] bg-[var(--paper-elevated)]"
      data-section="editorial"
    >
      <div className="editorial-container">
        <div className="grid gap-6 border-b border-[var(--rule)] pb-8 md:grid-cols-[1fr_auto] md:items-end md:gap-12">
          <div>
            <SectionLabel>आज का संस्करण · Today&apos;s Edition</SectionLabel>
            <h2 className="headline-md mt-4 max-w-[20ch]">
              Chhattisgarh, filed for careful reading
            </h2>
          </div>
          <p className="deck max-w-xs text-[var(--ink-muted)] md:text-right">
            Politics, civic life, business, education, sport — sequenced by
            editors, not algorithms.
          </p>
        </div>

        <ScrollReveal
          className="mt-12 grid gap-x-[var(--space-column)] gap-y-12 lg:grid-cols-12 lg:gap-y-16"
          stagger={0.18}
        >
          {EDITORIAL_STORIES.map((story, index) => {
            const href = `/story/${story.slug}`;
            const isFeature = story.feature;

            return (
              <article
                key={story.slug}
                data-reveal
                id={story.kicker === "Sports" ? "sports" : undefined}
                className={`group flex flex-col ${story.span} ${story.offset ?? ""} ${
                  isFeature
                    ? "editorial-grid-feature column-rule pb-2 lg:pr-10"
                    : "border-t border-[var(--rule)] pt-7 lg:border-t-0 lg:pt-0"
                }`}
              >
                <SectionLabel variant="muted" className="mb-3">
                  {story.kicker}
                  {story.kickerHi ? (
                    <span
                      className="ml-2 normal-case tracking-normal text-[var(--ink-faint)]"
                      style={{ fontFamily: "var(--font-hindi)" }}
                    >
                      {story.kickerHi}
                    </span>
                  ) : null}
                </SectionLabel>

                <Link href={href} className="story-link block">
                  <h3
                    className={`max-w-[26ch] ${isFeature ? "headline-md" : "headline-sm"}`}
                  >
                    {story.title}
                  </h3>
                </Link>

                <IncompleteReveal
                  className="mt-4"
                  initialClip={0.26}
                  delay={0.06 + index * 0.04}
                >
                  <div className="excerpt-fade">
                    <p className="editorial-body max-w-prose text-[15px] leading-relaxed md:text-base">
                      {story.excerpt}
                    </p>
                  </div>
                </IncompleteReveal>

                <div className="mt-auto flex items-end justify-between gap-4 border-t border-[var(--rule)] pt-5">
                  <span className="meta-label text-[var(--ink-faint)]">
                    {story.readTime}
                  </span>
                  <Link
                    href={href}
                    className="meta-label min-h-[44px] min-w-[44px] flex items-center justify-end text-[var(--ink-primary)] transition-opacity duration-500 hover:opacity-50"
                  >
                    Read →
                  </Link>
                </div>
              </article>
            );
          })}
        </ScrollReveal>

        <Rule className="mt-14" />
        <p className="meta-label mt-6 text-center text-[var(--ink-faint)]">
          Front section ends · Editorial & investigations follow
        </p>
      </div>
    </section>
  );
}
