import { getPrioritizedDistricts } from "@/lib/regional/districts";

export type FooterLink = {
  href: string;
  label: string;
  /** When false, link is omitted from the rendered footer. */
  enabled?: boolean;
};

export type FooterColumn = {
  title: string;
  links: FooterLink[];
  /** Optional column id for tests / accordion keys */
  id?: string;
};

/**
 * Known-valid public routes for Reader DS publication footer.
 * Careers / advertise landing / unconfigured social are omitted until real.
 */
export const READER_DS_FOOTER_ROUTE_ALLOWLIST = new Set([
  "/",
  "/latest",
  "/trending",
  "/district",
  "/district?select=1",
  "/live",
  "/listen",
  "/membership",
  "/contact",
  "/about",
  "/privacy",
  "/terms",
  "/corrections",
  "/ads-policy",
  "/editorial-policy",
  "/copyright-content-removal",
  "/sitemap.xml",
  "/feed.xml",
  "/saved",
  "/notifications",
  "/archive/notifications",
  "/archive/saved",
  "/rates",
  "/news/national",
  "/news/international",
  "/category/chhattisgarh",
  "/category/politics",
  "/category/business",
  "/category/education",
  "/category/health",
  "/category/sports",
  "/category/entertainment",
  "/category/technology",
  "/category/world",
]);

/** High-traffic district slugs surfaced in the footer directory. */
export const FOOTER_DISTRICT_SLUGS = [
  "raipur",
  "durg",
  "bilaspur",
  "korba",
  "raigarh",
  "rajnandgaon",
  "bastar",
  "janjgir-champa",
] as const;

export function districtFooterHref(slug: string): string {
  return `/district/${slug}`;
}

export function isFooterRouteAllowed(href: string): boolean {
  if (!href) return false;
  if (READER_DS_FOOTER_ROUTE_ALLOWLIST.has(href)) return true;
  // District detail pages: /district/{known-slug}
  const m = /^\/district\/([a-z0-9-]+)$/i.exec(href);
  if (m) {
    const slug = m[1]!.toLowerCase();
    return getPrioritizedDistricts().some((d) => d.slug === slug);
  }
  return false;
}

export function filterFooterLinks(links: FooterLink[]): FooterLink[] {
  return links.filter((l) => {
    if (l.enabled === false) return false;
    if (!l.href || !l.label?.trim()) return false;
    // External http(s) allowed only when explicitly enabled
    if (/^https?:\/\//i.test(l.href)) return l.enabled === true;
    return isFooterRouteAllowed(l.href);
  });
}

export function filterFooterColumns(cols: FooterColumn[]): FooterColumn[] {
  return cols
    .map((c) => ({ ...c, links: filterFooterLinks(c.links) }))
    .filter((c) => c.links.length > 0);
}

export type PublicationFooterLabels = {
  newsNav: string;
  districts: string;
  allDistricts: string;
  publication: string;
  utilities: string;
  topHeadlines: string;
  chhattisgarh: string;
  india: string;
  politics: string;
  business: string;
  education: string;
  health: string;
  sports: string;
  entertainment: string;
  technology: string;
  about: string;
  contact: string;
  editorial: string;
  corrections: string;
  privacy: string;
  terms: string;
  ads: string;
  sitemap: string;
  rss: string;
  listen: string;
  saved: string;
  notifications: string;
  support: string;
  rates: string;
};

/** Build publication footer columns — only allowlisted destinations. */
export function buildPublicationFooterColumns(
  labels: PublicationFooterLabels,
  opts?: {
    locale?: "hi" | "en";
    socialLinks?: FooterLink[];
  }
): FooterColumn[] {
  const locale = opts?.locale ?? "hi";

  const newsNav: FooterColumn = {
    id: "news",
    title: labels.newsNav,
    links: [
      { href: "/", label: labels.topHeadlines },
      { href: "/category/chhattisgarh", label: labels.chhattisgarh },
      { href: "/news/national", label: labels.india },
      { href: "/category/politics", label: labels.politics },
      { href: "/category/business", label: labels.business },
      { href: "/category/education", label: labels.education },
      { href: "/category/health", label: labels.health },
      { href: "/category/sports", label: labels.sports },
      { href: "/category/entertainment", label: labels.entertainment },
      { href: "/category/technology", label: labels.technology },
    ],
  };

  const districtLinks: FooterLink[] = FOOTER_DISTRICT_SLUGS.map((slug) => {
    const d = getPrioritizedDistricts().find((x) => x.slug === slug);
    return {
      href: districtFooterHref(slug),
      label: locale === "en" ? (d?.name ?? slug) : (d?.nameHi ?? d?.name ?? slug),
    };
  });
  districtLinks.push({
    href: "/district?select=1",
    label: labels.allDistricts,
  });

  const districts: FooterColumn = {
    id: "districts",
    title: labels.districts,
    links: districtLinks,
  };

  const publication: FooterColumn = {
    id: "publication",
    title: labels.publication,
    links: [
      { href: "/about", label: labels.about },
      { href: "/contact", label: labels.contact },
      { href: "/editorial-policy", label: labels.editorial },
      { href: "/corrections", label: labels.corrections },
      { href: "/privacy", label: labels.privacy },
      { href: "/terms", label: labels.terms },
      { href: "/ads-policy", label: labels.ads },
      // careers omitted — no public route
      { href: "/sitemap.xml", label: labels.sitemap },
      { href: "/feed.xml", label: labels.rss },
    ],
  };

  const utilities: FooterColumn = {
    id: "utilities",
    title: labels.utilities,
    links: [
      { href: "/listen", label: labels.listen },
      { href: "/saved", label: labels.saved },
      { href: "/notifications", label: labels.notifications },
      { href: "/membership", label: labels.support },
      { href: "/rates", label: labels.rates },
    ],
  };

  const social = (opts?.socialLinks ?? []).filter(
    (l) => l.enabled === true && /^https?:\/\//i.test(l.href) && l.label?.trim()
  );

  const cols: FooterColumn[] = [newsNav, districts, publication, utilities];
  if (social.length) {
    cols.push({
      id: "social",
      title: locale === "en" ? "Follow" : "सोशल",
      links: social,
    });
  }

  return filterFooterColumns(cols);
}
