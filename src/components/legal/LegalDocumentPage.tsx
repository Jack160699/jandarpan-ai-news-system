import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import type { PolicyDocument } from "@/lib/legal/policies";

type LegalDocumentPageProps = {
  doc: PolicyDocument;
};

export function LegalDocumentPage({ doc }: LegalDocumentPageProps) {
  return (
    <PageShell>
      <main
        id="main-content"
        className="nr-root pl-container mx-auto max-w-2xl py-8 pb-24"
      >
        <Link
          href="/"
          className="mb-6 inline-flex text-sm font-semibold text-[#a01830] no-underline dark:text-red-400"
        >
          ← Back
        </Link>
        <h1 className="m-0 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
          {doc.titleEn}
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Last updated {doc.updated}
        </p>
        <div className="mt-8 space-y-6">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="m-0 text-base font-bold text-stone-800 dark:text-stone-100">
                {section.heading}
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </main>
    </PageShell>
  );
}
