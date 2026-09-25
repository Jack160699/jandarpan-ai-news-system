import Link from "next/link";
import { ContactForm } from "@/components/contact/ContactForm";
import { FooterSocialIcon } from "@/components/footer/FooterSocialIcon";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { PageShell } from "@/components/layout/PageShell";
import { organizationJsonLdFromSettings } from "@/lib/organization/json-ld";
import { buildOrganizationSocialLinks } from "@/lib/organization/social";
import type { OrganizationSettings } from "@/lib/organization/types";
import { webPageJsonLd } from "@/lib/seo/json-ld";
import type { FooterSocialId } from "@/lib/footer/config";
import { CANONICAL_IDENTITY } from "@/lib/compliance/canonical-identity";

const SOCIAL_ID_MAP: Record<string, FooterSocialId> = {
  facebook: "facebook",
  instagram: "instagram",
  x: "twitter",
  youtube: "youtube",
  whatsapp: "whatsapp",
};

type ContactPageContentProps = {
  settings: OrganizationSettings;
  mission: string;
};

export function ContactPageContent({ settings, mission }: ContactPageContentProps) {
  const social = buildOrganizationSocialLinks(settings);
  const orgJsonLd = organizationJsonLdFromSettings(settings);
  const pageJsonLd = webPageJsonLd(
    "Contact Jan Darpan",
    `Reach our editorial team at ${settings.email}.`,
    "/contact"
  );

  return (
    <PageShell pageTitle="Contact us · Jan Darpan">
      <JsonLdScript data={[orgJsonLd, pageJsonLd]} />
      <main
        id="main-content"
        className="nr-root pl-container mx-auto max-w-3xl py-8 pb-24 px-4 text-stone-800 dark:text-stone-200"
      >
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-stone-500">
          <Link href="/" className="hover:underline text-[var(--jd-red)] font-semibold">
            Home
          </Link>
          <span className="mx-2 text-stone-400">/</span>
          <span className="text-stone-700 dark:text-stone-300 font-medium">Contact</span>
        </nav>

        <header className="border-b border-stone-200 dark:border-stone-800 pb-6 mb-8">
          <h1 className="m-0 jd-serif text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
            Contact Jan Darpan
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-stone-600 dark:text-stone-400">
            {mission}
          </p>
        </header>

        {/* Priority Statutory Grievance Redressal Card */}
        <section aria-labelledby="statutory-grievance-contact" className="mb-8 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/20 p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[var(--jd-red)] text-white">
              Statutory Grievance Redressal · Rule 11
            </span>
          </div>
          <h2 id="statutory-grievance-contact" className="m-0 text-base font-bold text-stone-900 dark:text-stone-100">
            Digital News Grievance Officer: {CANONICAL_IDENTITY.grievanceOfficer.name}
          </h2>
          <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
            For complaints regarding published news, ethics code violations, or factual corrections under IT Rules Part III.
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-white dark:bg-stone-900 p-3 rounded-lg border border-red-100 dark:border-red-950">
              <span className="text-xs text-stone-500 font-semibold block uppercase">Primary Grievance WhatsApp</span>
              <a
                href={`https://wa.me/${CANONICAL_IDENTITY.grievanceOfficer.primaryWhatsAppClean}?text=Namaste%20Grievance%20Officer,%20I%20wish%20to%20file%20a%20grievance%20regarding%20Jan%20Darpan%20content.`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[var(--jd-red)] hover:underline inline-flex items-center gap-1.5 mt-1"
              >
                <span>{CANONICAL_IDENTITY.grievanceOfficer.primaryWhatsApp}</span>
                <span className="text-[11px] bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded font-medium">WhatsApp</span>
              </a>
              <p className="text-[11px] text-stone-500 mt-1">
                For fastest grievance registration, send your grievance as a WhatsApp message to {CANONICAL_IDENTITY.grievanceOfficer.primaryWhatsApp}.
              </p>
            </div>

            <div className="bg-white dark:bg-stone-900 p-3 rounded-lg border border-red-100 dark:border-red-950">
              <span className="text-xs text-stone-500 font-semibold block uppercase">Grievance Email</span>
              <a
                href={`mailto:${CANONICAL_IDENTITY.grievanceOfficer.email}?subject=Jan%20Darpan%20Grievance%20Submission`}
                className="font-bold text-[var(--jd-red)] hover:underline block mt-1"
              >
                {CANONICAL_IDENTITY.grievanceOfficer.email}
              </a>
              <p className="text-[11px] text-stone-500 mt-1">
                Official statutory grievance inbox. Acknowledged within 24 hours.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href="/grievance-redressal"
              className="inline-flex items-center text-xs font-bold text-white bg-[var(--jd-red)] hover:bg-[#851428] px-3.5 py-2 rounded-lg transition-colors"
            >
              Open Web Grievance Form & SLA Tracker →
            </Link>
            <span className="text-xs text-stone-500">
              Mandatory 24-hr acknowledgement & 15-day resolution clock
            </span>
          </div>
        </section>

        {/* General Editorial & Newsroom Contact */}
        <section className="mb-8 space-y-4" aria-labelledby="newsroom-details">
          <h2 id="newsroom-details" className="m-0 text-base font-bold text-stone-900 dark:text-stone-100">
            Newsroom, Desk & Bureau Contacts
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-stone-50 dark:bg-stone-900/60 p-4 rounded-xl border border-stone-200 dark:border-stone-800">
            <div>
              <dt className="font-semibold text-stone-500 dark:text-stone-400">Editorial Bureau Email</dt>
              <dd className="mt-1">
                <a
                  href={`mailto:${CANONICAL_IDENTITY.businessAndGeneral.editorialEmail}`}
                  className="font-medium text-[#a01830] no-underline dark:text-red-400"
                >
                  {CANONICAL_IDENTITY.businessAndGeneral.editorialEmail}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-500 dark:text-stone-400">Additional Jan Darpan / Business WhatsApp</dt>
              <dd className="mt-1">
                <a
                  href={`https://wa.me/${CANONICAL_IDENTITY.businessAndGeneral.additionalWhatsAppClean}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-stone-800 dark:text-stone-100 hover:underline"
                >
                  {CANONICAL_IDENTITY.businessAndGeneral.additionalWhatsApp}
                </a>
                <span className="block text-[11px] text-stone-500">News tips, subscription and advertising inquiries</span>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-semibold text-stone-500 dark:text-stone-400">Legal Operating Entity & Registered Office</dt>
              <dd className="text-stone-800 dark:text-stone-200 mt-1">
                <strong>{CANONICAL_IDENTITY.legalEntity.legalName}</strong> (CIN: {CANONICAL_IDENTITY.legalEntity.cin})
                <br />
                {CANONICAL_IDENTITY.legalEntity.registeredOffice.formatted}
              </dd>
            </div>
          </dl>
        </section>

        {social.length > 0 ? (
          <section className="mb-8" aria-labelledby="contact-social">
            <h2 id="contact-social" className="m-0 mb-3 text-base font-bold text-stone-800 dark:text-stone-100">
              Social Media Channels
            </h2>
            <ul className="flex flex-wrap gap-3">
              {social.map((s) => {
                const iconId = SOCIAL_ID_MAP[s.id];
                return (
                  <li key={s.id}>
                    <a
                      href={s.href}
                      className="jd-footer__social-btn tap-target inline-flex"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                    >
                      {iconId ? (
                        <FooterSocialIcon id={iconId} />
                      ) : (
                        <span className="text-xs font-bold">{s.label[0]}</span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section className="mb-8" aria-labelledby="contact-form-title">
          <h2 id="contact-form-title" className="m-0 mb-4 text-base font-bold text-stone-800 dark:text-stone-100">
            Send a General Message
          </h2>
          <ContactForm recipientLabel={settings.email} />
        </section>
      </main>
    </PageShell>
  );
}
