"use client";

import Link from "next/link";
import { useJdDsT } from "../i18n";

/**
 * Desktop/tablet footer — 5-col SoT composition (collapses via CSS).
 */
export function DeskFooter() {
  const { t, locale } = useJdDsT();
  const year = new Date().getFullYear();

  const cols: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
    {
      title: t("footer.news"),
      links: [
        { href: "/latest", label: t("nav.latest") },
        { href: "/trending", label: t("home.trending") },
        { href: "/district", label: t("nav.district") },
        { href: "/live", label: "Live" },
      ],
    },
    {
      title: t("footer.sections"),
      links: [
        { href: "/category/politics", label: locale === "en" ? "Politics" : "राजनीति" },
        { href: "/category/business", label: locale === "en" ? "Business" : "व्यापार" },
        { href: "/category/sports", label: locale === "en" ? "Sports" : "खेल" },
        { href: "/category/opinion", label: locale === "en" ? "Opinion" : "ओपिनियन" },
      ],
    },
    {
      title: t("footer.support"),
      links: [
        { href: "/membership", label: t("desk.becomeMember") },
        { href: "/listen", label: t("nav.listen") },
        { href: "/contact", label: t("footer.contact") },
        { href: "/about", label: t("footer.about") },
      ],
    },
    {
      title: t("footer.legal"),
      links: [
        { href: "/privacy", label: t("footer.privacy") },
        { href: "/terms", label: t("footer.terms") },
        { href: "/corrections", label: t("footer.corrections") },
        { href: "/ads-policy", label: t("footer.ads") },
      ],
    },
  ];

  return (
    <footer className="jd-desk-footer jd-ui" data-jd-locale={locale}>
      <div className="jd-desk-inner jd-desk-footer__grid">
        <div className="jd-desk-footer__brand">
          <div className="jd-desk-footer__logo">
            <span className="jd-desk-mark">ज</span>
            <span className="jd-brand">{t("brand.name")}</span>
          </div>
          <p>{t("footer.blurb")}</p>
        </div>
        {cols.map((col) => (
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
