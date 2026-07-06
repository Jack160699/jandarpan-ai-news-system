"use client";

import Link from "next/link";
import { FooterSocialIcon } from "@/components/footer/FooterSocialIcon";
import { TenantLogo } from "@/components/tenant/TenantLogo";
import { FOOTER_LEGAL_LINKS } from "@/lib/organization/footer-links";
import { buildOrganizationSocialLinks } from "@/lib/organization/social";
import type { OrganizationSocialId } from "@/lib/organization/types";
import type { FooterSocialId } from "@/lib/footer/config";
import { useLanguage } from "@/providers/LanguageProvider";
import { useOrganization } from "@/providers/OrganizationProvider";
import { useTenant } from "@/providers/TenantProvider";

const SOCIAL_ICON_MAP: Partial<Record<OrganizationSocialId, FooterSocialId>> = {
  facebook: "facebook",
  instagram: "instagram",
  x: "twitter",
  youtube: "youtube",
  whatsapp: "whatsapp",
};

export function Footer() {
  const { t, language } = useLanguage();
  const { tenant } = useTenant();
  const org = useOrganization();
  const brandName =
    language === "en" ? tenant.branding.nameEn : tenant.branding.nameHi;
  const year = new Date().getFullYear();
  const social = buildOrganizationSocialLinks(org);

  return (
    <footer id="footer" className="jd-footer site-footer" role="contentinfo">
      <div className="jd-footer__inner pl-container">
        <div className="jd-footer__brand">
          <TenantLogo variant="banner" showText={false} className="jd-footer__logo" />
          <div className="jd-footer__brand-text">
            <p className="jd-footer__brand-name">{org.organizationName || brandName}</p>
            <p className="jd-footer__brand-tagline">{t.footer.taglineFooter}</p>
          </div>
        </div>

        <nav className="jd-footer__block" aria-labelledby="footer-legal-nav">
          <h2 id="footer-legal-nav" className="jd-footer__label">
            {t.footer.standardsTitle}
          </h2>
          <ul className="jd-footer__legal-links">
            {FOOTER_LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="jd-footer__legal-link tap-target">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {social.length > 0 ? (
          <section
            className="jd-footer__block jd-footer__block--social"
            aria-labelledby="footer-social"
          >
            <h2 id="footer-social" className="jd-footer__label">
              {t.footer.followTitle}
            </h2>
            <ul className="jd-footer__social">
              {social.map((s) => {
                const iconId = SOCIAL_ICON_MAP[s.id];
                return (
                  <li key={s.id}>
                    <a
                      href={s.href}
                      className="jd-footer__social-btn tap-target"
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

        <div className="jd-footer__legal">
          <p className="jd-footer__copy">
            © {year} {org.organizationName || brandName}
          </p>
          <p className="jd-footer__registry">{t.footer.publisherLine}</p>
          {org.email ? (
            <p className="jd-footer__registry">
              <a href={`mailto:${org.email}`} className="jd-footer__legal-link">
                {org.email}
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
