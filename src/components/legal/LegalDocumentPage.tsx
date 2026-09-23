import Link from "next/link";
import { LegalPolicyContent } from "@/components/legal/LegalPolicyContent";
import { PageShell } from "@/components/layout/PageShell";
import type { PolicyDocument } from "@/lib/legal/policies";

type LegalDocumentPageProps = {
  doc: PolicyDocument;
};

export function LegalDocumentPage({ doc }: LegalDocumentPageProps) {
  return (
    <PageShell pageTitle={doc.titleEn}>
      <main
        id="main-content"
        className="nr-root pl-container mx-auto max-w-3xl py-8 pb-24 px-4"
      >
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-stone-500">
          <Link href="/" className="hover:underline text-[var(--jd-red)] font-semibold">
            Home
          </Link>
          <span className="mx-2 text-stone-400">/</span>
          <span className="text-stone-700 dark:text-stone-300 font-medium">{doc.titleEn}</span>
        </nav>
        <h1 className="m-0 jd-serif text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
          {doc.titleEn}
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Last updated {doc.updated}
        </p>
        <LegalPolicyContent doc={doc} variant="page" />
      </main>
    </PageShell>
  );
}

