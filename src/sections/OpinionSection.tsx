"use client";

import { useEffect, useRef } from "react";
import { animateEditorialParagraph } from "@/animations/gsap-presets";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Rule } from "@/components/ui/Rule";
import { IncompleteReveal } from "@/components/motion/IncompleteReveal";
import { TypographyReveal } from "@/components/motion/TypographyReveal";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const COLUMNS = [
  {
    author: "Prof. Ramesh Sahu",
    role: "Guest editorial · Raipur University",
    title: "Regional media must slow down for verification",
    quoteHi: "सत्यापन के बिना गति, भ्रम की भाषा है —",
    quote:
      "Speed without verification is the language of confusion, not democracy —",
  },
  {
    author: "Meenakshi Verma",
    role: "Editorial board",
    title: "Why the ward water chart belongs on the front page",
    quoteHi: "एक समय सारणी भी राजनीति है —",
    quote:
      "A timing chart is also politics. Citizens read it with the same attention they give a speech —",
  },
];

export function OpinionSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !sectionRef.current) return;
    const paras = sectionRef.current.querySelectorAll("[data-opinion-p]");
    const tween = animateEditorialParagraph(paras);
    return () => {
      tween.kill();
    };
  }, [reduced]);

  return (
    <section
      id="opinion"
      ref={sectionRef}
      data-section="opinion"
      className="section-pad bg-[var(--paper-warm)] paper-edge"
    >
      <div className="editorial-container">
        <SectionLabel>Editorial · संपादकीय</SectionLabel>
        <TypographyReveal className="mt-3">
          <h2 className="headline-md">The argument page</h2>
        </TypographyReveal>
        <p
          className="meta-label mt-3 text-[var(--ink-faint)]"
          style={{ fontFamily: "var(--font-hindi)" }}
        >
          मत · विचार · जवाबदेही
        </p>

        <Rule className="my-10 md:my-12" />

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <article className="lg:col-span-5 lg:pr-6">
            <IncompleteReveal initialClip={0.28}>
              <p
                className="pull-quote text-[var(--ink-primary)]"
                data-opinion-p
                style={{ fontFamily: "var(--font-hindi)" }}
              >
                &ldquo;अखबार शोर नहीं — स्पष्टता लाता है।&rdquo;
              </p>
            </IncompleteReveal>
            <p className="editorial-body mt-6 reading-measure" data-opinion-p>
              CG Bhaskar&apos;s opinion pages are filed for disagreement. A
              regional newspaper earns trust when it prints the counter-argument
              beside its own lead.
            </p>
          </article>

          <div className="grid gap-10 lg:col-span-7 lg:gap-12">
            {COLUMNS.map((col, i) => (
              <article
                key={col.author}
                className={`border-l-2 border-[var(--brand-maroon-deep,var(--ink-primary))] pl-5 md:pl-7 ${
                  i === 1 ? "lg:ml-8" : ""
                }`}
              >
                <p className="meta-label text-[var(--ink-muted)]">
                  {col.author} · {col.role}
                </p>
                <h3 className="headline-sm mt-3 max-w-[24ch]">{col.title}</h3>
                <div className="excerpt-fade excerpt-fade--warm mt-4">
                  <p
                    className="text-base text-[var(--ink-secondary)] md:text-lg"
                    style={{ fontFamily: "var(--font-hindi)" }}
                    data-opinion-p
                  >
                    {col.quoteHi}
                  </p>
                  <p
                    className="deck mt-3 italic text-[var(--ink-secondary)]"
                    data-opinion-p
                  >
                    {col.quote}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
