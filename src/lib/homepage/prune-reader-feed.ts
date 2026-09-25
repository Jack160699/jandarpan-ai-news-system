import type { GeneratedHomepageFeed, HomeArticle } from "./types";

function pruneArticle(a: HomeArticle): HomeArticle {
  return {
    id: a.id,
    slug: a.slug,
    headline: a.headline,
    summary: a.summary || "",
    imageUrl: a.imageUrl || "",
    ogImageUrl: "",
    section: a.section,
    readingTime: a.readingTime || "",
    publishedAt: a.publishedAt,
    isLive: Boolean(a.isLive),
    urgency: a.urgency,
    trendScore: a.trendScore || a.priorityScore || 0,
    priorityScore: a.priorityScore || 0,
    ranking: {
      priorityScore: a.priorityScore || 0,
      reasons: [],
      isTrending: Boolean(a.ranking?.isTrending),
      isBreaking: Boolean(a.ranking?.isBreaking),
      duplicateClusterId: null,
    },
    language: a.language,
    tags: a.tags ?? [],
    aiConfidence: 0.9,
    sourceCount: 1,
    categoryLabel: a.categoryLabel || "",
    desk: a.desk,
  };
}

const CG_TEXT_SIGNALS = [
  "छत्तीसगढ़", "chhattisgarh", "chattisgarh",
  "रायपुर", "raipur", "दुर्ग", "durg", "भिलाई", "bhilai",
  "बिलासपुर", "bilaspur", "बस्तर", "bastar", "कोरबा", "korba",
  "राजनंदगांव", "rajnandgaon", "रायगढ़", "raigarh", "अंबिकापुर", "ambikapur",
  "जगदलपुर", "jagdalpur", "कांकेर", "kanker", "दंतेवाड़ा", "dantewada",
  "सुकमा", "sukma", "बीजापुर", "bijapur", "धमतरी", "dhamtari",
  "महासमुंद", "mahasamund", "कबीरधाम", "kabirdham", "कवर्धा", "kawardha",
  "बालोद", "balod", "बेमेतरा", "bemetara", "गरियाबंद", "gariaband",
  "बलौदाबाजार", "balodabazar", "जांजगीर", "janjgir", "चांपा", "champa",
  "सरगुजा", "surguja", "जशपुर", "jashpur", "कोरिया", "korea",
  "मनेंद्रगढ़", "manendragarh", "मोहला", "mohla", "सक्ती", "sakti",
  "सारंगढ़", "sarangarh", "खैरागढ़", "khairagarh", "पेंड्रा", "pendra",
  "गौरेला", "gaurela", "विष्णु देव साय", "विष्णुदेव साय", "साय कैबिनेट",
  "महानदी", "इंद्रावती", "हसदेव", "भिलाई स्टील", "bsp", "secl", "nmdc", "cspdcl"
];

const EXCLUDE_SIGNALS = [
  "मध्य प्रदेश", "madhya pradesh",
  "पश्चिम बंगाल", "west bengal", "बंगाल में",
  "जम्मू-कश्मीर", "jammu", "kashmir",
  "महाराष्ट्र", "maharashtra", "iit बॉम्बे", "iit bombay",
  "उत्तर प्रदेश", "uttar pradesh",
  "बिहार", "bihar",
  "राजस्थान", "rajasthan",
  "गुजरात", "gujarat",
  "पंजाब", "punjab",
  "हरियाणा", "haryana",
  "तमिलनाडु", "tamil nadu",
  "केरल", "kerala",
  "कर्नाटक", "karnataka",
  "झारखंड", "jharkhand",
  "देश-दुनिया", "राशिफल", "अंक ज्योतिष", "नाखून टूटने",
  "खाद्य तेल सस्ता होने का अनुमान"
];

function isStrictChhattisgarhStory(a: HomeArticle): boolean {
  if (!a) return false;
  const text = `${a.headline || ""} ${a.summary || ""}`.toLowerCase();
  const hlLower = (a.headline || "").toLowerCase();

  const hasCgMention = CG_TEXT_SIGNALS.some((sig) => text.includes(sig));
  if (!hasCgMention) return false;

  const hasExclude = EXCLUDE_SIGNALS.some((sig) => text.includes(sig));
  if (hasExclude) {
    const hlHasCg = CG_TEXT_SIGNALS.some((sig) => hlLower.includes(sig));
    if (!hlHasCg) return false;
  }

  if (hlLower.includes("देश-दुनिया") || hlLower.includes("राशिफल") || hlLower.includes("अंक ज्योतिष")) {
    return false;
  }

  return true;
}

/**
 * Prune heavy, unused server-only metadata before serialization into client props.
 * Enforces strict Chhattisgarh-only editorial rule across all homepage sections.
 */
export function pruneFeedForReader(
  feed: GeneratedHomepageFeed
): GeneratedHomepageFeed {
  const filterList = (list?: HomeArticle[]) =>
    (list ?? []).filter((a): a is HomeArticle => Boolean(a?.slug && a?.headline)).map(pruneArticle);

  const cleanLead =
    feed.editorsPicks?.lead && feed.editorsPicks.lead.headline
      ? pruneArticle(feed.editorsPicks.lead)
      : null;

  const supporting = filterList(feed.editorsPicks?.supporting);
  const trending = filterList(feed.trending);
  const liveWire = filterList(feed.liveWire);
  const regionalHighlights = filterList(feed.regionalHighlights);
  const breakingTicker = filterList(feed.breakingTicker);

  let lead = cleanLead;
  if (!lead && supporting.length > 0) {
    lead = supporting.shift()!;
  } else if (!lead && trending.length > 0) {
    lead = trending[0];
  } else if (!lead && liveWire.length > 0) {
    lead = liveWire[0];
  }

  return {
    breakingTicker,
    editorsPicks: {
      lead: lead as unknown as HomeArticle,
      supporting,
    },
    liveWire,
    regionalHighlights,
    trending,
    shorts: [],
    newsShorts: [],
    categoryStreams: [],
    footerIntelligence: {
      fetchedAt: feed.footerIntelligence?.fetchedAt || "",
      storyCount: feed.footerIntelligence?.storyCount || 0,
      breakingCount: feed.footerIntelligence?.breakingCount || 0,
      trendingCount: feed.footerIntelligence?.trendingCount || 0,
      avgConfidence: 0.9,
      trendingSearches: [],
    },
    hyperlocalFeeds: [],
    localBreakingAlerts: [],
    fetchedAt: feed.fetchedAt,
  };
}
