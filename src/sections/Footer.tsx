"use client";

import Link from "next/link";
import { Mail, Phone, User } from "lucide-react";
import { FooterSocialIcon } from "@/components/footer/FooterSocialIcon";
import { TenantLogo } from "@/components/tenant/TenantLogo";
import {
  FOOTER_EDITORIAL_CONTACTS,
  FOOTER_QUICK_LINKS,
  FOOTER_SOCIAL,
  FOOTER_DISTRICT_SLUGS,
} from "@/lib/footer/config";
import { CG_DISTRICTS } from "@/lib/regional/districts";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTenant } from "@/providers/TenantProvider";

const districtMap = new Map(CG_DISTRICTS.map((d) => [d.slug, d]));

export function Footer() {
  const { t, language } = useLanguage();
  const { tenant } = useTenant();
  const brandName =
    language === "en" ? tenant.branding.nameEn : tenant.branding.nameHi;
  const year = new Date().getFullYear();

  const districts = FOOTER_DISTRICT_SLUGS.map((slug) => districtMap.get(slug)).filter(
    (d): d is NonNullable<typeof d> => Boolean(d)
  );

  return (
    <footer id="footer" className="jd-footer site-footer" role="contentinfo">
      <div className="jd-footer__inner pl-container">
        {/* Brand */}
        <div className="jd-footer__brand">
          <TenantLogo variant="banner" showText={false} className="jd-footer__logo" />
          <div className="jd-footer__brand-text">
            <p className="jd-footer__brand-name">{brandName}</p>
            <p className="jd-footer__brand-tagline">{t.footer.taglineFooter}</p>
          </div>
        </div>

        {/* Quick links */}
        <section className="jd-footer__block" aria-labelledby="footer-quick-links">
          <h2 id="footer-quick-links" className="jd-footer__label">
            {t.footer.quickLinksTitle}
          </h2>
          <ul className="jd-footer__chips">
            {FOOTER_QUICK_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="jd-footer__chip tap-target">
                  {t.footer.links[item.key]}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Districts */}
        <section className="jd-footer__block" aria-labelledby="footer-districts">
          <h2 id="footer-districts" className="jd-footer__label">
            {t.footer.districtsTitle}
          </h2>
          <ul className="jd-footer__district-grid">
            {districts.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/district/${d.slug}`}
                  className="jd-footer__district tap-target"
                >
                  <span className="jd-footer__district-name">
                    {language === "en" ? d.name : d.nameHi}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Editorial contacts */}
        <section className="jd-footer__block" aria-labelledby="footer-contacts">
          <h2 id="footer-contacts" className="jd-footer__label">
            {t.footer.editorialContactsTitle}
          </h2>
          <ul className="jd-footer__contacts">
            {FOOTER_EDITORIAL_CONTACTS.map((contact) => (
              <li key={contact.email}>
                <article className="jd-footer__contact-card">
                  <p className="jd-footer__contact-name">
                    <User className="jd-footer__contact-icon" aria-hidden />
                    <span>{contact.name}</span>
                  </p>
                  <p className="jd-footer__contact-row">
                    <Phone className="jd-footer__contact-icon" aria-hidden />
                    <a href={contact.phoneHref} className="jd-footer__contact-link">
                      {contact.phone}
                    </a>
                  </p>
                  <p className="jd-footer__contact-row">
                    <Mail className="jd-footer__contact-icon" aria-hidden />
                    <a
                      href={`mailto:${contact.email}`}
                      className="jd-footer__contact-link jd-footer__contact-link--email"
                    >
                      {contact.email}
                    </a>
                  </p>
                </article>
              </li>
            ))}
          </ul>
        </section>

        {/* Social */}
        <section className="jd-footer__block jd-footer__block--social" aria-labelledby="footer-social">
          <h2 id="footer-social" className="jd-footer__label">
            {t.footer.followTitle}
          </h2>
          <ul className="jd-footer__social">
            {FOOTER_SOCIAL.map((s) => (
              <li key={s.id}>
                <a
                  href={s.href}
                  className="jd-footer__social-btn tap-target"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                >
                  <FooterSocialIcon id={s.id} />
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Copyright */}
        <div className="jd-footer__legal">
          <p className="jd-footer__copy">
            © {year} {brandName}
          </p>
          <p className="jd-footer__registry">{t.footer.publisherLine}</p>
        </div>
      </div>
    </footer>
  );
}
