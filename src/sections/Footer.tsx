"use client";

import Link from "next/link";
import { FooterTodayLive } from "@/components/footer/FooterTodayLive";
import { FooterSocialIcon } from "@/components/footer/FooterSocialIcon";
import { TenantLogo } from "@/components/tenant/TenantLogo";
import { FOOTER_QUICK_LINKS, FOOTER_SOCIAL } from "@/lib/footer/config";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTenant } from "@/providers/TenantProvider";

type FooterProps = {
  breakingHeadline?: string | null;
  localInfo?: string | null;
};

export function Footer({ breakingHeadline, localInfo }: FooterProps) {
  const { t, language } = useLanguage();
  const { tenant } = useTenant();
  const brandName =
    language === "en" ? tenant.branding.nameEn : tenant.branding.nameHi;
  const year = new Date().getFullYear();

  return (
    <footer id="footer" className="jd-footer site-footer" role="contentinfo">
      <div className="jd-footer__inner pl-container">
        <div className="jd-footer__brand">
          <TenantLogo variant="banner" showText={false} className="jd-footer__logo" />
          <div className="jd-footer__brand-text">
            <p className="jd-footer__brand-name">{brandName}</p>
            <p className="jd-footer__brand-tagline">{t.footer.taglineFooter}</p>
          </div>
        </div>

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

        <FooterTodayLive
          breakingHeadline={breakingHeadline}
          localInfo={localInfo}
        />

        <section
          className="jd-footer__block jd-footer__block--social"
          aria-labelledby="footer-social"
        >
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
