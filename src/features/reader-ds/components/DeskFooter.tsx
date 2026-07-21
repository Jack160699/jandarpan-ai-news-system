"use client";

import Link from "next/link";
import { useJdDsT } from "../i18n";
import { filterFooterColumns, type FooterColumn } from "../homepage/footer-links";
import { BrandMark } from "./BrandMark";

/**
 * Site footer — desktop grid + compact phone ending above bottom nav.
 * Only known-valid routes are rendered (dead links filtered).
 */
export function DeskFooter() {
  const { t, locale } = useJdDsT();
  const year = new Date().getFullYear();

  const cols: FooterColumn[] = [
    {
      title: t("footer.news"),
      links: [
        { href: "/latest", label: t("nav.latest") },
        { href: "/trending", label: t("home.mostRead") },
        { href: "/district", label: t("nav.district") },
        { href: "/live", label: locale === "en" ? "Live" : "लाइव" },
      ],
    },
    {
      title: t("footer.sections"),
      links: [
        { href: "/category/chhattisgarh", label: locale === "en" ? "Chhattisgarh" : "छत्तीसगढ़" },
        { href: "/category/politics", label: locale === "en" ? "Politics" : "राजनीति" },
        { href: "/category/india", label: locale === "en" ? "India" : "भारत" },
        { href: "/category/world", label: locale === "en" ? "World" : "दुनिया" },
        { href: "/category/business", label: locale === "en" ? "Business" : "व्यापार" },
        { href: "/category/sports", label: locale === "en" ? "Sports" : "खेल" },
        { href: "/category/education", label: locale === "en" ? "Education" : "शिक्षा" },
      ],
    },
    {
      title: t("footer.support"),
      links: [
        { href: "/membership", label: t("desk.becomeMember") },
        { href: "/listen", label: t("nav.listen") },
        { href: "/contact", label: t("footer.contact") },
        { href: "/about", label: t("footer.about") },
        { href: "/rates", label: t("footer.rates") },
        // Careers omitted — no public route
        // Social omitted — not configured
      ],
    },
    {
      title: t("footer.legal"),
      links: [
        { href: "/editorial-policy", label: t("footer.editorial") },
        { href: "/corrections", label: t("footer.corrections") },
        { href: "/privacy", label: t("footer.privacy") },
        { href: "/terms", label: t("footer.terms") },
        { href: "/ads-policy", label: t("footer.ads") },
        { href: "/sitemap.xml", label: t("footer.sitemap") },
      ],
    },
  ];

  const visible = filterFooterColumns(cols);

  return (
    <footer
      className="jd-desk-footer jd-ui"
      data-jd-locale={locale}
      data-testid="jd-desk-footer"
    >
      <div className="jd-desk-inner jd-desk-footer__grid">
        <div className="jd-desk-footer__brand">
          <div className="jd-desk-footer__logo">
            <BrandMark size={22} radius={5} />
            <span className="jd-brand">{t("brand.name")}</span>
          </div>
          <p>{t("footer.blurb")}</p>
        </div>
        {visible.map((col) => (
          <div key={col.title} className="jd-desk-footer__col">
            <h3>{col.title}</h3>
            <ul>
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="jd-desk-footer__bar">
        <div className="jd-desk-inner">
          © {year} {t("brand.name")} · {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
}
