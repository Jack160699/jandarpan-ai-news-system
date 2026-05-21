"use client";

import Link from "next/link";
import { FadeUp } from "@/components/motion/FadeUp";
import { IncompleteReveal } from "@/components/motion/IncompleteReveal";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { HERO_ARTICLE_SLUG } from "@/lib/articles";

const SERIES = [
  {
    part: "I",
    title: "The gap in row 412",
    summary:
      "Eleven days without a scan on the Naya Raipur allotment register. Farmers queue with folders thick with stamps —",
  },
  {
    part: "II",
    title: "Permissions granted, revoked, granted",
    summary:
      "Access logs show a sequence inside one department — not a hacker drama but familiar paperwork —",
  },
  {
    part: "III",
    title: "The backup that surfaced on night four",
    summary:
      "Earlier versions of the file, dated before a hearing officials said was never scheduled —",
  },
];

export function Investigations() {
  return (
    <section
      id="investigations"
      data-section="investigations"
      className="investigations-panel section-gravitas border-t border-[var(--rule)] bg-[var(--paper-warm)] text-[var(--ink-primary)]"
    >
      <div className="editorial-container">
        <FadeUp>
          <SectionLabel>Investigations · खोज</SectionLabel>
          <IncompleteReveal initialClip={0.22}>
            <h2 className="headline-lg mt-4 max-w-[16ch] text-[var(--ink-primary)]">
              Naya Raipur · Land & record
            </h2>
          </IncompleteReveal>
          <p className="deck mt-8 max-w-xl text-[var(--ink-secondary)]">
            A multi-part examination of a missing civic register, the farmers
            who queued twice, and what eleven days without a file can mean in
            Chhattisgarh.
          </p>
        </FadeUp>

        <div className="mt-12 border border-[var(--rule)] bg-[var(--paper-elevated)] px-5 py-7 md:px-9">
          <p className="archive-marker">From the desk of</p>
          <p className="mt-3 font-[family-name:var(--font-display)] text-xl text-[var(--ink-primary)]">
            Investigations · A. Tiwari
          </p>
          <p className="meta-label mt-2 text-[var(--ink-muted)]">
            Filing system CGB-INV · Cross-desk with Raipur & State
          </p>
        </div>

        <ScrollReveal
          className="mt-14 grid gap-10 md:grid-cols-12 md:gap-x-8"
          stagger={0.2}
        >
          {SERIES.map((item, i) => (
            <article
              key={item.part}
              data-reveal
              className={`border-l border-[var(--brand-maroon)]/25 pl-5 md:pl-7 ${
                i === 0 ? "md:col-span-7" : "md:col-span-5"
              } ${i === 1 ? "md:ml-4" : ""}`}
            >
              <span className="meta-label text-[var(--ink-faint)]">Part {item.part}</span>
              <Link
                href={`/story/${HERO_ARTICLE_SLUG}`}
                className="story-link mt-3 block"
              >
                <h3 className="headline-sm text-[var(--ink-primary)]">{item.title}</h3>
              </Link>
              <div className="excerpt-fade mt-3">
                <p className="editorial-body text-sm text-[var(--ink-muted)]">
                  {item.summary}
                </p>
              </div>
              <Link
                href={`/story/${HERO_ARTICLE_SLUG}`}
                className="meta-label mt-5 inline-block min-h-[44px] leading-[44px] text-[var(--brand-maroon-deep)]"
              >
                Open filing →
              </Link>
            </article>
          ))}
        </ScrollReveal>

        <p className="meta-label mt-12 text-center text-[var(--ink-faint)]">
          Lead thread continues in today&apos;s main investigation
        </p>
      </div>
    </section>
  );
}
