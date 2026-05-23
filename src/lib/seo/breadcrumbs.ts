/**
 * Breadcrumb trails — UI + schema.org BreadcrumbList
 */

import { BRAND } from "@/lib/brand";
import { categoryPath, getCategorySeo } from "@/lib/seo/categories";
import { SITE_URL } from "@/lib/seo/constants";
import type { NewsCategory } from "@/lib/types/news-article";

export type BreadcrumbItem = {
  name: string;
  href: string;
};

export function buildHomeBreadcrumb(): BreadcrumbItem {
  return { name: BRAND.nameEn, href: "/" };
}

export function buildCategoryBreadcrumb(slug: string, label?: string): BreadcrumbItem {
  const config = getCategorySeo(slug);
  return {
    name: label ?? config?.titleEn ?? slug,
    href: categoryPath(slug),
  };
}

export function buildStoryBreadcrumbs(input: {
  category: NewsCategory | string;
  headline: string;
  slug: string;
  categoryLabel?: string;
}): BreadcrumbItem[] {
  const catSlug =
    input.category === "local" ? "chhattisgarh" : input.category;
  const cat = buildCategoryBreadcrumb(catSlug, input.categoryLabel);

  return [
    buildHomeBreadcrumb(),
    cat,
    {
      name: input.headline.slice(0, 80),
      href: `/story/${input.slug}`,
    },
  ];
}

export function breadcrumbListJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.href.startsWith("http") ? item.href : `${SITE_URL}${item.href}`,
    })),
  };
}
