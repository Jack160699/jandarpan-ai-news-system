import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { BrandedErrorFallback } from "@/components/errors/BrandedErrorFallback";

export default function NotFound() {
  return (
    <PageShell variant="news">
      <main id="main-content" role="main">
        <BrandedErrorFallback
          title="Page not found"
          message="This story, section, or page may have moved. Head back to today's edition or search for a topic."
          showHome
        />
        <div className="editorial-container pb-24 text-center">
          <Link
            href="/search"
            className="inline-flex min-h-11 items-center rounded-full border border-[var(--rule-strong)] px-5 text-sm font-semibold tap-target"
          >
            Search the edition
          </Link>
        </div>
      </main>
    </PageShell>
  );
}
