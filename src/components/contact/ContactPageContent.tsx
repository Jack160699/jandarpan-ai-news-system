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
  const location = [settings.address, settings.city, settings.state]
    .filter(Boolean)
    .join(", ");
  const social = buildOrganizationSocialLinks(settings);
  const orgJsonLd = organizationJsonLdFromSettings(settings);
  const pageJsonLd = webPageJsonLd(
    "Contact Jan Darpan",
    `Reach our editorial team at ${settings.email}.`,
    "/contact"
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
          Contact us
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">
          {mission}
        </p>

        <section className="mt-8 space-y-4" aria-labelledby="contact-details">
          <h2 id="contact-details" className="m-0 text-base font-bold text-stone-800 dark:text-stone-100">
            Newsroom contact
          </h2>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="font-semibold text-stone-500 dark:text-stone-400">Email</dt>
              <dd>
                <a
                  href={`mailto:${settings.email}`}
                  className="font-medium text-[#a01830] no-underline dark:text-red-400"
                >
                  {settings.email}
                </a>
              </dd>
            </div>
            {settings.phone ? (
              <div>
                <dt className="font-semibold text-stone-500 dark:text-stone-400">Phone</dt>
                <dd>
                  <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="text-stone-800 dark:text-stone-100">
                    {settings.phone}
                  </a>
                </dd>
              </div>
            ) : null}
            {location ? (
              <div>
                <dt className="font-semibold text-stone-500 dark:text-stone-400">Location</dt>
                <dd className="text-stone-700 dark:text-stone-200">{location}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        {social.length > 0 ? (
          <section className="mt-8" aria-labelledby="contact-social">
            <h2 id="contact-social" className="m-0 mb-3 text-base font-bold text-stone-800 dark:text-stone-100">
              Follow us
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

        <section className="mt-8" aria-labelledby="contact-form-title">
          <h2 id="contact-form-title" className="m-0 mb-4 text-base font-bold text-stone-800 dark:text-stone-100">
            Send a message
          </h2>
          <ContactForm recipientLabel={settings.email} />
        </section>

        <section className="mt-10" aria-labelledby="contact-map">
          <h2 id="contact-map" className="m-0 mb-3 text-base font-bold text-stone-800 dark:text-stone-100">
            Map
          </h2>
          {settings.googleMapsUrl ? (
            <div className="overflow-hidden rounded-lg border border-stone-200 dark:border-stone-700">
              <iframe
                title="Office location"
                src={settings.googleMapsUrl}
                className="h-56 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-400">
              Map location — configure Google Maps URL in admin settings
            </div>
          )}
        </section>
      </main>
    </PageShell>
  );
}
