/**
 * Story Knowledge navigation — maps metadata labels to existing routes only.
 * Search is the fallback when no dedicated page exists.
 */

import { CG_DISTRICTS, type CgDistrict } from "@/lib/regional/districts";
import { CATEGORY_SEO, categoryPath, getCategorySeo } from "@/lib/seo/categories";
import { SEO_HOMEPAGE_CLUSTERS } from "@/lib/seo/homepage-hub";
import type { NewsCategory } from "@/lib/types/news-article";

export type KnowledgeNavLink = {
  label: string;
  href: string;
  ariaLabel: string;
};

export type StoryKnowledgeNavVm = {
  category: KnowledgeNavLink | null;
  district: KnowledgeNavLink | null;
  people: KnowledgeNavLink[];
  organizations: KnowledgeNavLink[];
  locations: KnowledgeNavLink[];
  programs: KnowledgeNavLink[];
  topics: KnowledgeNavLink[];
  readerKeywords: KnowledgeNavLink[];
  relatedConcepts: KnowledgeNavLink[];
};

const PRIMARY_CATEGORY_SLUG: Partial<Record<NewsCategory, string>> = {
  local: "chhattisgarh",
  politics: "politics",
  business: "business",
  sports: "sports",
  technology: "technology",
  entertainment: "entertainment",
  health: "health",
  world: "world",
};

const TOPIC_HUB_PATHS = SEO_HOMEPAGE_CLUSTERS.filter((cluster) =>
  cluster.path.startsWith("/topics/")
);

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function knowledgeSearchHref(query: string): string {
  return `/search?q=${encodeURIComponent(query.trim())}`;
}

function findDistrictByLabel(label: string): CgDistrict | undefined {
  const norm = normalizeKey(label);
  return CG_DISTRICTS.find(
    (district) =>
      district.slug === norm ||
      normalizeKey(district.name) === norm ||
      district.nameHi === label.trim() ||
      district.aliases.some((alias) => normalizeKey(alias) === norm)
  );
}

export function resolveDistrictHref(
  districtLabel: string | null,
  districtSlug?: string | null
): string | null {
  if (districtSlug && getDistrictPath(districtSlug)) {
    return `/district/${districtSlug}`;
  }
  if (!districtLabel) return null;
  const district = findDistrictByLabel(districtLabel);
  return district ? `/district/${district.slug}` : knowledgeSearchHref(districtLabel);
}

function getDistrictPath(slug: string): boolean {
  return CG_DISTRICTS.some((district) => district.slug === slug);
}

export function resolveCategoryHref(
  articleCategory: NewsCategory,
  categoryLabel: string | null
): string {
  if (getCategorySeo(articleCategory)) {
    return categoryPath(articleCategory);
  }

  const labelNorm = categoryLabel ? normalizeKey(categoryLabel) : "";
  for (const config of CATEGORY_SEO) {
    if (labelNorm && normalizeKey(config.titleEn) === labelNorm) return config.path;
    if (categoryLabel && config.titleHi === categoryLabel.trim()) return config.path;
    if (labelNorm && config.slug === labelNorm) return config.path;
  }

  const primary = PRIMARY_CATEGORY_SLUG[articleCategory];
  if (primary && getCategorySeo(primary)) {
    return categoryPath(primary);
  }

  const byNewsCategory = CATEGORY_SEO.find(
    (config) => config.newsCategory === articleCategory
  );
  if (byNewsCategory) return byNewsCategory.path;

  return knowledgeSearchHref(categoryLabel ?? articleCategory);
}

export function resolveTopicHref(topic: string): string {
  const norm = normalizeKey(topic);
  const trimmed = topic.trim();

  if (getCategorySeo(norm)) {
    return categoryPath(norm);
  }

  for (const config of CATEGORY_SEO) {
    if (normalizeKey(config.titleEn) === norm) return config.path;
    if (config.titleHi === trimmed) return config.path;
    if (config.slug === norm) return config.path;
    if (config.keywords.some((keyword) => normalizeKey(keyword) === norm)) {
      return config.path;
    }
  }

  for (const cluster of TOPIC_HUB_PATHS) {
    if (cluster.slug === norm || normalizeKey(cluster.slug) === norm) {
      return cluster.path;
    }
    if (normalizeKey(cluster.titleEn) === norm) return cluster.path;
    if (cluster.titleHi === trimmed) return cluster.path;
    if (cluster.keywords.some((keyword) => normalizeKey(keyword) === norm)) {
      return cluster.path;
    }
  }

  const district = findDistrictByLabel(trimmed);
  if (district) return `/district/${district.slug}`;

  return knowledgeSearchHref(topic);
}

function link(
  label: string,
  href: string,
  ariaLabel: string
): KnowledgeNavLink {
  return { label, href, ariaLabel };
}

function mapSearchLinks(
  labels: string[],
  ariaLabelFor: (label: string) => string
): KnowledgeNavLink[] {
  return labels.map((label) =>
    link(label, knowledgeSearchHref(label), ariaLabelFor(label))
  );
}

export type BuildStoryKnowledgeNavInput = {
  articleCategory: NewsCategory;
  categoryLabel: string | null;
  districtLabel: string | null;
  districtSlug: string | null;
  people: string[];
  organizations: string[];
  locations: string[];
  programs: string[];
  topics: string[];
  readerKeywords: string[];
  relatedConcepts: string[];
};

export function buildStoryKnowledgeNav(
  input: BuildStoryKnowledgeNavInput
): StoryKnowledgeNavVm {
  const categoryHref = resolveCategoryHref(
    input.articleCategory,
    input.categoryLabel
  );

  const districtHref = resolveDistrictHref(
    input.districtLabel,
    input.districtSlug
  );

  return {
    category: input.categoryLabel
      ? link(
          input.categoryLabel,
          categoryHref,
          `More ${input.categoryLabel} coverage`
        )
      : null,
    district: input.districtLabel
      ? link(
          input.districtLabel,
          districtHref ?? knowledgeSearchHref(input.districtLabel),
          `More coverage from ${input.districtLabel}`
        )
      : null,
    people: input.people.map((name) =>
      link(name, knowledgeSearchHref(name), `Explore more about ${name}`)
    ),
    organizations: input.organizations.map((name) =>
      link(
        name,
        knowledgeSearchHref(name),
        `Articles mentioning ${name}`
      )
    ),
    locations: input.locations.map((name) =>
      link(name, knowledgeSearchHref(name), `Stories about ${name}`)
    ),
    programs: mapSearchLinks(
      input.programs,
      (name) => `Coverage of ${name}`
    ),
    topics: input.topics.map((topic) =>
      link(topic, resolveTopicHref(topic), `Stories about ${topic}`)
    ),
    readerKeywords: mapSearchLinks(
      input.readerKeywords,
      (keyword) => `Search for ${keyword}`
    ),
    relatedConcepts: mapSearchLinks(
      input.relatedConcepts,
      (concept) => `Stories about ${concept}`
    ),
  };
}
