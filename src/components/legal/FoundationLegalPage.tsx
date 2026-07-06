import Link from "next/link";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { PageShell } from "@/components/layout/PageShell";
import { LegalPolicyContent } from "@/components/legal/LegalPolicyContent";
import { webPageJsonLd } from "@/lib/seo/json-ld";
import type { PolicyDocument } from "@/lib/legal/policies";

type FoundationLegalPageProps = {
  doc: PolicyDocument;
};

export function FoundationLegalPage({ doc }: FoundationLegalPageProps) {
  const description = doc.sections[0]?.body ?? doc.titleEn;
  const jsonLd = webPageJsonLd(doc.titleEn, description, doc.path);

  return (
    <PageShell>
      <JsonLdScript data={jsonLd} />
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
        <LegalPolicyContent doc={doc} variant="page" />
      </main>
    </PageShell>
  );
}
