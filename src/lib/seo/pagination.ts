/**
 * Pagination + faceted URL metadata helpers.
 *
 * Archive pagination (when implemented on hub pages):
 *   page 1 → canonical = base path
 *   page ≥2 → canonical = self (?page=N)
 *
 * Faceted deep links (?section=, ?start=) are not archive pages —
 * use buildFacetedVariantMetadata (noindex, canonical = base).
 */

import type { Metadata } from "next";
import {
  NOINDEX_FOLLOW_ROBOTS,
  PRODUCTION_ROBOTS,
  SITE_URL,
} from "@/lib/seo/constants";

export function parsePageNumber(raw: string | undefined | null): number {
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Path for a paginated collection (query-param style). */
export function buildPaginatedPath(basePath: string, page: number): string {
  const normalized = basePath.startsWith("/") ? basePath : `/${basePath}`;
  if (page <= 1) return normalized;
  const joiner = normalized.includes("?") ? "&" : "?";
  return `${normalized}${joiner}page=${page}`;
}

export function buildPaginatedCanonicalUrl(basePath: string, page: number): string {
  return `${SITE_URL}${buildPaginatedPath(basePath, page)}`;
}

export function buildPaginatedTitle(baseTitle: string, page: number): string {
  if (page <= 1) return baseTitle;
  return `${baseTitle} – Page ${page}`;
}

export type PaginatedCollectionMetadataInput = {
  baseTitle: string;
  description: string;
  basePath: string;
  page: number;
};

/**
 * Metadata for indexable archive pages (category/topic/district page 2+).
 * Not for search query URLs — those use search-specific noindex rules.
 */
export function buildPaginatedCollectionMetadata(
  input: PaginatedCollectionMetadataInput
): Metadata {
  const page = Math.max(1, input.page);
  const canonicalUrl = buildPaginatedCanonicalUrl(input.basePath, page);
  const title = buildPaginatedTitle(input.baseTitle, page);

  return {
    title,
    description: input.description,
    alternates: { canonical: canonicalUrl },
    robots: PRODUCTION_ROBOTS,
    openGraph: {
      title,
      description: input.description,
      url: canonicalUrl,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description: input.description,
    },
  };
}

export type FacetedVariantMetadataInput = {
  baseTitle: string;
  description: string;
  basePath: string;
};

/**
 * Deep-link / filter variants on a canonical hub (e.g. ?section=, ?start=).
 * Crawlable but not indexed; canonical always points to the base hub URL.
 */
export function buildFacetedVariantMetadata(
  input: FacetedVariantMetadataInput
): Metadata {
  const basePath = input.basePath.startsWith("/")
    ? input.basePath
    : `/${input.basePath}`;
  const canonicalUrl = `${SITE_URL}${basePath}`;

  return {
    title: input.baseTitle,
    description: input.description,
    alternates: { canonical: canonicalUrl },
    robots: NOINDEX_FOLLOW_ROBOTS,
    openGraph: {
      title: input.baseTitle,
      description: input.description,
      url: canonicalUrl,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: input.baseTitle,
      description: input.description,
    },
  };
}

/**
 * rel=prev/next are not emitted: Next.js Metadata has no supported alternates
 * type for pagination links, and Google deprecated rel=next/prev as an indexing
 * signal (2019). Use crawlable <a href> pagination in page markup when added.
 */
export const PAGINATION_REL_LINKS_UNSUPPORTED = true as const;
