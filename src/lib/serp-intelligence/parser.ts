/**
 * SERP response parsing — normalizes SerpAPI and Google CSE payloads.
 */

import {
  COMPETITOR_DOMAIN_MAP,
  JANDARPAN_DOMAIN,
} from "@/lib/serp-intelligence/config";
import type {
  SerpCollectedSnapshot,
  SerpFeatures,
  SerpOrganicResult,
} from "@/lib/serp-intelligence/types";

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export function isJandarpanDomain(domain: string): boolean {
  const normalized = domain.replace(/^www\./, "").toLowerCase();
  return (
    normalized === JANDARPAN_DOMAIN ||
    normalized.endsWith(`.${JANDARPAN_DOMAIN}`)
  );
}

export function resolveCompetitorName(domain: string): string | null {
  const normalized = domain.replace(/^www\./, "").toLowerCase();
  if (COMPETITOR_DOMAIN_MAP[normalized]) return COMPETITOR_DOMAIN_MAP[normalized];
  for (const [key, name] of Object.entries(COMPETITOR_DOMAIN_MAP)) {
    if (normalized === key || normalized.endsWith(`.${key}`)) return name;
  }
  return null;
}

function emptyFeatures(): SerpFeatures {
  return {
    top_stories: false,
    people_also_ask: false,
    image_pack: false,
    video: false,
    knowledge_panel: false,
    local_pack: false,
    news_box: false,
    featured_snippet: false,
    feature_owners: {},
    paa_questions: [],
  };
}

export function parseSerpApiResponse(
  keyword: string,
  data: Record<string, unknown>
): SerpCollectedSnapshot {
  const features = emptyFeatures();
  const owners: SerpFeatures["feature_owners"] = {};

  const organicRaw = Array.isArray(data.organic_results)
    ? (data.organic_results as Record<string, unknown>[])
    : [];

  const organic_results: SerpOrganicResult[] = organicRaw
    .slice(0, 10)
    .map((item, idx) => {
      const url = String(item.link ?? item.url ?? "");
      const domain = extractDomain(url);
      return {
        position: Number(item.position ?? idx + 1),
        title: String(item.title ?? ""),
        url,
        snippet: String(item.snippet ?? item.description ?? ""),
        domain,
        site: (item.source as string | undefined) ?? domain,
        publish_date: (item.date as string | undefined) ?? null,
      };
    });

  if (Array.isArray(data.top_stories) && data.top_stories.length > 0) {
    features.top_stories = true;
    owners.top_stories = (data.top_stories as Record<string, unknown>[])
      .map((s) => extractDomain(String(s.link ?? "")))
      .filter(Boolean);
  }

  if (Array.isArray(data.related_questions) && data.related_questions.length > 0) {
    features.people_also_ask = true;
    features.paa_questions = (data.related_questions as Record<string, unknown>[])
      .map((q) => String(q.question ?? ""))
      .filter(Boolean);
  }

  if (data.inline_images || data.images_results) {
    features.image_pack = true;
  }

  if (Array.isArray(data.video_results) && data.video_results.length > 0) {
    features.video = true;
    owners.video = (data.video_results as Record<string, unknown>[])
      .slice(0, 3)
      .map((v) => extractDomain(String(v.link ?? "")))
      .filter(Boolean);
  }

  if (data.knowledge_graph) {
    features.knowledge_panel = true;
  }

  if (data.local_results || data.local_map) {
    features.local_pack = true;
  }

  if (features.top_stories) {
    features.news_box = true;
  }

  if (data.answer_box || data.featured_snippet) {
    features.featured_snippet = true;
    const snippet = (data.featured_snippet ?? data.answer_box) as
      | Record<string, unknown>
      | undefined;
    if (snippet?.link) {
      owners.featured_snippet = [extractDomain(String(snippet.link))];
    }
  }

  features.feature_owners = owners;

  return {
    keyword,
    provider: "serpapi",
    organic_results,
    serp_features: features,
    raw_metadata: {
      search_metadata: data.search_metadata,
      search_information: data.search_information,
    },
  };
}

export function parseGoogleCseResponse(
  keyword: string,
  data: Record<string, unknown>
): SerpCollectedSnapshot {
  const features = emptyFeatures();
  const items = Array.isArray(data.items)
    ? (data.items as Record<string, unknown>[])
    : [];

  const organic_results: SerpOrganicResult[] = items.slice(0, 10).map((item, idx) => {
    const url = String(item.link ?? "");
    const domain = extractDomain(url);
    return {
      position: idx + 1,
      title: String(item.title ?? ""),
      url,
      snippet: String(item.snippet ?? ""),
      domain,
      site: domain,
      publish_date: null,
    };
  });

  return {
    keyword,
    provider: "google_cse",
    organic_results,
    serp_features: features,
    raw_metadata: {
      searchInformation: data.searchInformation,
    },
  };
}

/** Test helper — build snapshot from organic rows */
export function buildSnapshotFromOrganic(
  keyword: string,
  results: SerpOrganicResult[],
  features?: Partial<SerpFeatures>
): SerpCollectedSnapshot {
  return {
    keyword,
    provider: "test",
    organic_results: results,
    serp_features: { ...emptyFeatures(), ...features },
  };
}
