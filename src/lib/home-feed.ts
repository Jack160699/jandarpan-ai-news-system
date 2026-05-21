import { articles, HERO_ARTICLE_SLUG, type Article } from "./articles";

export type FeedStory = {
  slug: string;
  title: string;
  titleHi?: string;
  kicker: string;
  kickerHi?: string;
  excerpt: string;
  image: string;
  readTime: string;
  filedAt: string;
  city?: string;
  isLive?: boolean;
  isBreaking?: boolean;
  isTrending?: boolean;
};

const META: Record<
  string,
  Partial<Pick<FeedStory, "filedAt" | "city" | "isLive" | "isBreaking" | "isTrending">>
> = {
  [HERO_ARTICLE_SLUG]: {
    filedAt: "12 min ago",
    city: "Raipur",
    isLive: true,
    isBreaking: true,
    isTrending: true,
  },
  "coal-auction-transparency": {
    filedAt: "28 min ago",
    city: "Raipur",
    isLive: true,
    isTrending: true,
  },
  "bastar-health-camp": {
    filedAt: "45 min ago",
    city: "Jagdalpur",
    isTrending: true,
  },
  "school-on-the-highway": { filedAt: "1 hr ago", city: "Durg" },
  "raipur-metro-debate": { filedAt: "1 hr ago", city: "Raipur", isTrending: true },
  "steel-plant-shifts": { filedAt: "2 hr ago", city: "Bhilai" },
  "stadium-youth-league": { filedAt: "2 hr ago", city: "Raipur" },
  "chhattisgarhi-folk-archive": { filedAt: "3 hr ago", city: "Rajnandgaon" },
  "water-timing-raipur": { filedAt: "4 hr ago", city: "Raipur" },
};

export function articleToFeed(
  article: Article,
  excerpt?: string
): FeedStory {
  const m = META[article.slug] ?? { filedAt: "Today" };
  return {
    slug: article.slug,
    title: article.title,
    titleHi: article.titleHi,
    kicker: article.kicker,
    kickerHi: article.kickerHi,
    excerpt: excerpt ?? article.deck,
    image: article.image,
    readTime: article.readTime,
    filedAt: m.filedAt ?? "Today",
    city: m.city,
    isLive: m.isLive,
    isBreaking: m.isBreaking,
    isTrending: m.isTrending,
  };
}

export function getFeedStory(slug: string): FeedStory | undefined {
  const a = articles[slug];
  return a ? articleToFeed(a) : undefined;
}

export const HERO_FEED = getFeedStory(HERO_ARTICLE_SLUG)!;

export const ALL_FEED_STORIES: FeedStory[] = Object.values(articles)
  .filter((a) => a.slug !== HERO_ARTICLE_SLUG)
  .map((a) => articleToFeed(a));

export const TRENDING_STORIES: FeedStory[] = [
  HERO_ARTICLE_SLUG,
  "coal-auction-transparency",
  "bastar-health-camp",
  "raipur-metro-debate",
  "stadium-youth-league",
  "water-timing-raipur",
]
  .map((s) => getFeedStory(s))
  .filter(Boolean) as FeedStory[];

export const LIVE_STORIES: FeedStory[] = [
  HERO_ARTICLE_SLUG,
  "coal-auction-transparency",
  "bastar-health-camp",
]
  .map((s) => getFeedStory(s))
  .filter(Boolean) as FeedStory[];

export const CITY_UPDATES: { city: string; cityHi: string; stories: FeedStory[] }[] = [
  {
    city: "Raipur",
    cityHi: "रायपुर",
    stories: ["raipur-metro-debate", "water-timing-raipur", "stadium-youth-league"]
      .map((s) => getFeedStory(s)!)
      .filter(Boolean),
  },
  {
    city: "Bastar",
    cityHi: "बस्तर",
    stories: ["bastar-health-camp"].map((s) => getFeedStory(s)!).filter(Boolean),
  },
  {
    city: "Bhilai",
    cityHi: "भिलाई",
    stories: ["steel-plant-shifts"].map((s) => getFeedStory(s)!).filter(Boolean),
  },
];

export type CategoryBlock = {
  id: string;
  title: string;
  titleHi: string;
  href: string;
  slugs: string[];
};

export const CATEGORY_BLOCKS: CategoryBlock[] = [
  {
    id: "politics",
    title: "Politics",
    titleHi: "राजनीति",
    href: "#editorial",
    slugs: ["coal-auction-transparency", "raipur-metro-debate"],
  },
  {
    id: "chhattisgarh",
    title: "Chhattisgarh",
    titleHi: "छत्तीसगढ़",
    href: "#editorial",
    slugs: ["bastar-health-camp", "chhattisgarhi-folk-archive", "school-on-the-highway"],
  },
  {
    id: "sports",
    title: "Sports",
    titleHi: "खेल",
    href: "#sports",
    slugs: ["stadium-youth-league"],
  },
  {
    id: "business",
    title: "Business & Jobs",
    titleHi: "व्यापार",
    href: "#editorial",
    slugs: ["steel-plant-shifts", "water-timing-raipur"],
  },
];

export const QUICK_READ_SLUGS = [
  "water-timing-raipur",
  "steel-plant-shifts",
  "stadium-youth-league",
  "chhattisgarhi-folk-archive",
  "school-on-the-highway",
  "raipur-metro-debate",
  "bastar-health-camp",
  "coal-auction-transparency",
];
