export type FooterLink = {
  href: string;
  label: string;
  /** When false, link is omitted from the rendered footer. */
  enabled?: boolean;
};

export type FooterColumn = {
  title: string;
  links: FooterLink[];
};

/**
 * Known-valid public routes for Reader DS footer.
 * Careers / dedicated advertise / social are omitted until real routes exist.
 */
export const READER_DS_FOOTER_ROUTE_ALLOWLIST = new Set([
  "/latest",
  "/trending",
  "/district",
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
  "/sitemap.xml",
  "/category/politics",
  "/category/business",
  "/category/sports",
  "/category/chhattisgarh",
  "/category/india",
  "/category/world",
  "/category/education",
  "/news/national",
  "/news/international",
  "/rates",
]);

export function filterFooterLinks(links: FooterLink[]): FooterLink[] {
  return links.filter((l) => {
    if (l.enabled === false) return false;
    if (!l.href || !l.label?.trim()) return false;
    // External http(s) allowed only when explicitly enabled
    if (/^https?:\/\//i.test(l.href)) return l.enabled === true;
    return READER_DS_FOOTER_ROUTE_ALLOWLIST.has(l.href);
  });
}

export function filterFooterColumns(cols: FooterColumn[]): FooterColumn[] {
  return cols
    .map((c) => ({ ...c, links: filterFooterLinks(c.links) }))
    .filter((c) => c.links.length > 0);
}
