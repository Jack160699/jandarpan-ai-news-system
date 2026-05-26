import type { ContentType } from "../content/types";

/** Platform topic content types → ingest `news_articles.category` values */
export const CONTENT_TYPE_TO_INGEST_CATEGORIES: Record<string, string[]> = {
  district_news: ["local", "district_news"],
  national_news: ["politics", "national_news", "india"],
  international_news: ["world", "international_news"],
  breaking_news: ["local", "politics", "breaking_news"],
  jobs: ["jobs", "business"],
  sports: ["sports"],
  markets: ["business", "markets"],
  education: ["education"],
  tech: ["technology", "tech"],
  fact_checks: ["fact_checks", "politics"],
  yojana: ["yojana", "local"],
};

export function ingestCategoriesForContentTypes(types: string[]): string[] {
  const set = new Set<string>();
  for (const type of types) {
    const mapped = CONTENT_TYPE_TO_INGEST_CATEGORIES[type];
    if (mapped?.length) {
      for (const c of mapped) set.add(c);
    } else {
      set.add(type);
    }
  }
  return [...set];
}

export function platformCategoryFromIngest(category: string): ContentType {
  const normalized = category.trim().toLowerCase();
  const map: Record<string, ContentType> = {
    local: "district_news",
    politics: "national_news",
    world: "international_news",
    business: "markets",
    sports: "sports",
    education: "education",
    technology: "tech",
    jobs: "jobs",
    yojana: "yojana",
    fact_checks: "fact_checks",
    district_news: "district_news",
    national_news: "national_news",
    international_news: "international_news",
    breaking_news: "breaking_news",
    markets: "markets",
    tech: "tech",
  };
  return map[normalized] ?? "district_news";
}
