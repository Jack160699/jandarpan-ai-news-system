/**
 * SEO-safe monetization helpers
 */

/** Prevent ad/sponsor copy from appearing in Google snippets */
export const NOSNIPPET_ATTRS = {
  "data-nosnippet": "",
  "data-ad": "true",
} as const;

export function sponsoredLinkRel(): string {
  return "sponsored noopener noreferrer";
}

export function affiliateLinkRel(): string {
  return "nofollow sponsored noopener noreferrer";
}

export function adLinkRel(): string {
  return "nofollow noopener noreferrer";
}

export function isSponsoredArticle(meta: {
  sponsorName?: string | null;
} | null | undefined): boolean {
  return Boolean(meta?.sponsorName?.trim());
}
