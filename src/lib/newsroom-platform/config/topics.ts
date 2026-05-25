import type { TopicHubMeta } from "../content/types";

export const PLATFORM_TOPIC_SLUGS = [
  "jobs",
  "sports",
  "markets",
  "district-news",
  "yojana",
  "fact-check",
  "education",
  "technology",
] as const;

export type PlatformTopicSlug = (typeof PLATFORM_TOPIC_SLUGS)[number];

export const PLATFORM_TOPICS: TopicHubMeta[] = [
  {
    slug: "jobs",
    titleEn: "Jobs & Careers",
    titleHi: "नौकरी और करियर",
    descriptionEn: "Government jobs, private vacancies, and career news for Chhattisgarh.",
    descriptionHi: "छत्तीसगढ़ के लिए सरकारी नौकरी और करियर खबरें।",
    keywords: ["CG jobs", "sarkari naukri", "रायपुर नौकरी"],
    articleCount: 0,
  },
  {
    slug: "sports",
    titleEn: "Sports & Cricket",
    titleHi: "खेल और क्रिकेट",
    descriptionEn: "Cricket, IPL, and state sports coverage.",
    descriptionHi: "क्रिकेट, IPL और राज्य खेल कवरेज।",
    keywords: ["IPL", "cricket Hindi", "CG sports"],
    articleCount: 0,
  },
  {
    slug: "markets",
    titleEn: "Markets & Business",
    titleHi: "बाजार और व्यापार",
    descriptionEn: "Markets, business, and economic updates.",
    descriptionHi: "बाजार, व्यापार और आर्थिक अपडेट।",
    keywords: ["Nifty", "Sensex", "CG business"],
    articleCount: 0,
  },
  {
    slug: "district-news",
    titleEn: "District News",
    titleHi: "जिला समाचार",
    descriptionEn: "Hyperlocal coverage from every major CG district.",
    descriptionHi: "हर बड़े जिले की हाइपरलोकल कवरेज।",
    keywords: ["Raipur news", "Bilaspur", "Bastar"],
    articleCount: 0,
  },
  {
    slug: "yojana",
    titleEn: "Sarkari Yojana",
    titleHi: "सरकारी योजना",
    descriptionEn: "Schemes, subsidies, and welfare updates.",
    descriptionHi: "योजना, सब्सिडी और लाभ अपडेट।",
    keywords: ["yojana CG", "welfare scheme"],
    articleCount: 0,
  },
  {
    slug: "fact-check",
    titleEn: "Fact Check",
    titleHi: "फैक्ट चेक",
    descriptionEn: "Verified reporting and misinformation debunks.",
    descriptionHi: "सत्यापित रिपोर्टिंग और गलत सूचना जाँच।",
    keywords: ["fact check", "fake news"],
    articleCount: 0,
  },
  {
    slug: "education",
    titleEn: "Education",
    titleHi: "शिक्षा",
    descriptionEn: "Board exams, scholarships, and school news.",
    descriptionHi: "बोर्ड परीक्षा, छात्रवृत्ति और स्कूल खबरें।",
    keywords: ["CG education", "exam result"],
    articleCount: 0,
  },
  {
    slug: "technology",
    titleEn: "Technology",
    titleHi: "टेक्नोलॉजी",
    descriptionEn: "AI, startups, and digital policy from India and CG.",
    descriptionHi: "AI, स्टार्टअप और डिजिटल नीति की खबरें।",
    keywords: ["tech news", "AI India"],
    articleCount: 0,
  },
];

const TOPIC_TO_CONTENT: Record<PlatformTopicSlug, string[]> = {
  jobs: ["jobs"],
  sports: ["sports"],
  markets: ["markets"],
  "district-news": ["district_news"],
  yojana: ["yojana"],
  "fact-check": ["fact_checks"],
  education: ["education"],
  technology: ["tech"],
};

export function getPlatformTopic(slug: string): TopicHubMeta | null {
  return PLATFORM_TOPICS.find((t) => t.slug === slug) ?? null;
}

export function isPlatformTopicSlug(slug: string): slug is PlatformTopicSlug {
  return (PLATFORM_TOPIC_SLUGS as readonly string[]).includes(slug);
}

export function contentTypesForTopic(slug: PlatformTopicSlug): string[] {
  return TOPIC_TO_CONTENT[slug] ?? [];
}
