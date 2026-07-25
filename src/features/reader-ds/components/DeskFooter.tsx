"use client";

import Link from "next/link";
import { useJdDsT } from "../i18n";
import {
  buildPublicationFooterColumns,
  type FooterLink,
} from "../homepage/footer-links";
import { BrandMark } from "./BrandMark";

type DeskFooterProps = {
  /** Configured social profiles only — never invent handles. */
  socialLinks?: FooterLink[];
  /** Optional ownership / publisher line already configured upstream. */
  publisherLine?: string | null;
};

/**
 * Publication-grade site footer — navy Reader DS identity.
 * Only known-valid routes render (dead links filtered).
 */
export function DeskFooter({ socialLinks, publisherLine }: DeskFooterProps = {}) {
  const { t, locale } = useJdDsT();
  const year = new Date().getFullYear();

  const cols = buildPublicationFooterColumns(
    {
      newsNav: t("footer.newsNav"),
      districts: t("footer.districts"),
      allDistricts: t("footer.allDistricts"),
      publication: t("footer.publication"),
      utilities: t("footer.utilities"),
      topHeadlines: t("footer.topHeadlines"),
      chhattisgarh: locale === "en" ? "Chhattisgarh" : "छत्तीसगढ़",
      india: locale === "en" ? "India" : "भारत",
      politics: locale === "en" ? "Politics" : "राजनीति",
      business: locale === "en" ? "Business" : "व्यापार",
      education: locale === "en" ? "Education" : "शिक्षा",
      health: locale === "en" ? "Health" : "स्वास्थ्य",
      sports: locale === "en" ? "Sports" : "खेल",
      entertainment: locale === "en" ? "Entertainment" : "मनोरंजन",
      technology: locale === "en" ? "Technology" : "टेक्नोलॉजी",
      about: t("footer.about"),
      contact: t("footer.contact"),
      editorial: t("footer.editorial"),
      corrections: t("footer.corrections"),
      privacy: t("footer.privacy"),
      terms: t("footer.terms"),
      ads: t("footer.ads"),
      sitemap: t("footer.sitemap"),
      rss: t("footer.rss"),
      listen: t("nav.listen"),
      saved: t("footer.saved"),
      notifications: t("footer.notifications"),
      support: t("home.supportJournalism"),
      rates: t("footer.rates"),
    },
    { locale, socialLinks }
  );

  return (
    <footer
      className="jd-desk-footer jd-ui"
      data-jd-locale={locale}
      data-testid="jd-desk-footer"
      role="contentinfo"
      aria-label={t("footer.aria")}
    >
      <div className="jd-desk-inner jd-desk-footer__grid">
        <div className="jd-desk-footer__brand">
          <div className="jd-desk-footer__logo">
            <BrandMark size={22} radius={5} />
            <span className="jd-brand">{t("brand.name")}</span>
          </div>
          <p className="jd-desk-footer__tagline">{t("desk.tagline")}</p>
          <p className="jd-desk-footer__blurb">{t("footer.blurb")}</p>
        </div>

        <div className="jd-desk-footer__cols" data-testid="jd-desk-footer-cols">
          {cols.map((col) => (
            <div
              key={col.id ?? col.title}
              className="jd-desk-footer__col"
              data-jd-footer-col={col.id}
            >
              <h3>{col.title}</h3>
              <ul className="jd-desk-footer__list">
                {col.links.map((l) => (
                  <li key={`${col.id ?? col.title}-${l.href}`}>
                    <Link href={l.href}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="jd-desk-footer__bar">
        <div className="jd-desk-inner jd-desk-footer__bar-inner">
          <span>
            © {year} {t("brand.name")}
            {publisherLine ? ` · ${publisherLine}` : ""} · {t("footer.rights")}
          </span>
        </div>
      </div>
    </footer>
  );
}
