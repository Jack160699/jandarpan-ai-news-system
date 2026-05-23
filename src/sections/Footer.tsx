"use client";

import Link from "next/link";
import { TenantLogo } from "@/components/tenant/TenantLogo";
import { BRAND } from "@/lib/brand";
import { getPrioritizedDistricts } from "@/lib/regional/districts";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTenant } from "@/providers/TenantProvider";

const FOOTER_LINK_KEYS = [
  { href: "/", key: "home" as const },
  { href: "/live", key: "live" as const },
  { href: "/shorts", key: "shorts" as const },
  { href: "/listen", key: "listen" as const },
  { href: "/category/chhattisgarh", key: "chhattisgarh" as const },
  { href: "/category/politics", key: "politics" as const },
  { href: "/category/sports", key: "sports" as const },
  { href: "/search", key: "search" as const },
  { href: "/archive", key: "archive" as const },
];

const SOCIAL = [
  { href: "https://www.facebook.com", label: "Facebook" },
  { href: "https://www.youtube.com", label: "YouTube" },
  { href: "https://twitter.com", label: "X" },
  { href: "https://wa.me", label: "WhatsApp" },
] as const;

export function Footer() {
  const { t, language } = useLanguage();
  const { tenant } = useTenant();
  const districts = getPrioritizedDistricts().slice(0, 10);
  const brandName = language === "en" ? tenant.branding.nameEn : tenant.branding.nameHi;

  return (
    <footer id="footer" className="site-footer" role="contentinfo">
      <div className="site-footer__brand-band">
        <div className="nr-wrap site-footer__brand-inner">
          <TenantLogo className="site-footer__logo" />
          <div>
            <p className="site-footer__network">{t.footer.networkName}</p>
            <h2 className="site-footer__name">{brandName}</h2>
            <p className="site-footer__tagline">{t.brand.tagline}</p>
          </div>
        </div>
      </div>

      <div className="nr-wrap site-footer__grid site-footer__grid--daily">
        <section aria-labelledby="footer-sections">
          <h3 id="footer-sections" className="site-footer__heading">
            {t.footer.sectionsTitle}
          </h3>
          <ul className="site-footer__links">
            {FOOTER_LINK_KEYS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="site-footer__link tap-target">
                  {t.footer.links[item.key]}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="footer-districts">
          <h3 id="footer-districts" className="site-footer__heading">
            {t.footer.districtsTitle}
          </h3>
          <ul className="site-footer__districts">
            {districts.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/district/${d.slug}`}
                  className="site-footer__district tap-target"
                >
                  <span className="site-footer__district-hi">{d.nameHi}</span>
                  <span className="site-footer__district-en">{d.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="footer-contact">
          <h3 id="footer-contact" className="site-footer__heading">
            {t.footer.contactTitle}
          </h3>
          <ul className="site-footer__contact">
            <li>
              <span className="site-footer__contact-label">
                {t.footer.corrections}
              </span>
              <a
                href={`mailto:${t.footer.editorialEmail}`}
                className="site-footer__email"
              >
                {t.footer.editorialEmail}
              </a>
            </li>
            <li>
              <span className="site-footer__contact-label">News tips</span>
              <a
                href={`mailto:${t.footer.tipsEmail}`}
                className="site-footer__email"
              >
                {t.footer.tipsEmail}
              </a>
            </li>
            <li>
              <span className="site-footer__contact-label">
                {BRAND.press}
              </span>
            </li>
          </ul>

          <h4 className="site-footer__subheading">{t.footer.followTitle}</h4>
          <ul className="site-footer__social">
            {SOCIAL.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  className="site-footer__social-link tap-target"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="site-footer__legal">
        <div className="nr-wrap site-footer__legal-inner">
          <p>
            © {new Date().getFullYear()} {BRAND.nameEn}. {t.footer.copyright}.
          </p>
          <p className="site-footer__registry">{BRAND.registry}</p>
        </div>
      </div>
    </footer>
  );
}
