"use client";

import type { PolicyDocument } from "@/lib/legal/policies";

type LegalPolicyContentProps = {
  doc: PolicyDocument;
  variant?: "page" | "gate";
};

/** Shared policy body — used on legal pages and language-gate sheet */
export function LegalPolicyContent({
  doc,
  variant = "page",
}: LegalPolicyContentProps) {
  const isGate = variant === "gate";

  return (
    <article className={isGate ? "legal-policy-content legal-policy-content--gate" : undefined}>
      <div className={isGate ? "legal-policy-content__sections" : "mt-8 space-y-6"}>
        {doc.sections.map((section, index) => (
          <section
            key={section.heading}
            className={isGate ? "legal-policy-content__section" : undefined}
          >
            <h2
              className={
                isGate
                  ? "legal-policy-content__heading"
                  : "m-0 text-base font-bold text-stone-800 dark:text-stone-100"
              }
            >
              {section.heading}
            </h2>
            <p
              className={
                isGate
                  ? "legal-policy-content__body"
                  : "mt-2 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300"
              }
            >
              {section.body}
            </p>
            {isGate && index < doc.sections.length - 1 ? (
              <hr className="legal-policy-content__divider" aria-hidden />
            ) : null}
          </section>
        ))}
      </div>
    </article>
  );
}
