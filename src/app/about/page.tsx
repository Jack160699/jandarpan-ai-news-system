import Link from "next/link";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { PageShell } from "@/components/layout/PageShell";
import { organizationJsonLdFromSettings } from "@/lib/organization/json-ld";
import { fetchOrganizationSettings } from "@/lib/organization/settings";
import { buildLegalPageMetadata } from "@/lib/legal/page-metadata";
import { webPageJsonLd } from "@/lib/seo/json-ld";
import { getTenantConfig } from "@/lib/tenant/resolve";

const MISSION =
  "Your Chhattisgarh — district bureaus, state desk, and live coverage you can trust.";

export async function generateMetadata() {
  const org = await fetchOrganizationSettings();
  return buildLegalPageMetadata({
    title: `About ${org.organizationName}`,
    description: `${MISSION} ${org.organizationName} is an independent regional digital newsroom serving Chhattisgarh.`,
    path: "/about",
  });
}

export default async function AboutPage() {
  const [org, tenant] = await Promise.all([
    fetchOrganizationSettings(),
    getTenantConfig(),
  ]);

  const orgJsonLd = organizationJsonLdFromSettings(org, tenant);
  const pageJsonLd = webPageJsonLd(
    `About ${org.organizationName}`,
    MISSION,
    "/about"
  );

  return (
    <PageShell>
      <JsonLdScript data={[orgJsonLd, pageJsonLd]} />
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
          About {org.organizationName}
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Independent regional publisher · Chhattisgarh, India
        </p>

        <section className="mt-8 space-y-6">
          <div>
            <h2 className="m-0 text-base font-bold text-stone-800 dark:text-stone-100">
              Our mission
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">
              {MISSION}
            </p>
          </div>

          <div>
            <h2 className="m-0 text-base font-bold text-stone-800 dark:text-stone-100">
              Who we are
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">
              {org.organizationName} is a Chhattisgarh-focused digital newsroom combining
              district bureaus, a state desk, and live coverage infrastructure. We publish
              in Hindi and English for readers across the state and the diaspora.
            </p>
          </div>

          <div>
            <h2 className="m-0 text-base font-bold text-stone-800 dark:text-stone-100">
              How we work
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">
              Our newsroom uses AI-assisted tools for discovery, summarization, and
              personalization — with human editors responsible for verification, context,
              and publication decisions. We cross-check wire reports and public sources,
              correct errors promptly, and publish our editorial standards openly.
            </p>
          </div>

          <div>
            <h2 className="m-0 text-base font-bold text-stone-800 dark:text-stone-100">
              Contact & standards
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">
              Reach our team at{" "}
              <a
                href={`mailto:${org.email}`}
                className="font-semibold text-[#a01830] no-underline dark:text-red-400"
              >
                {org.email}
              </a>
              . Read our{" "}
              <Link href="/editorial-policy" className="font-semibold text-[#a01830] no-underline dark:text-red-400">
                Editorial Policy
              </Link>
              ,{" "}
              <Link href="/corrections" className="font-semibold text-[#a01830] no-underline dark:text-red-400">
                Corrections Policy
              </Link>
              , and{" "}
              <Link href="/copyright-content-removal" className="font-semibold text-[#a01830] no-underline dark:text-red-400">
                Copyright & Content Removal Policy
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
