/**
 * Module 2 — SERP Collector
 * Fetches SERP data via SerpAPI (preferred) or Google Custom Search API.
 */

import {
  SERP_DEFAULT_GL,
  SERP_DEFAULT_HL,
  SERP_FETCH_TIMEOUT_MS,
  hasSerpProviderConfigured,
} from "@/lib/serp-intelligence/config";
import {
  parseGoogleCseResponse,
  parseSerpApiResponse,
} from "@/lib/serp-intelligence/parser";
import type { SerpCollectedSnapshot } from "@/lib/serp-intelligence/types";

async function fetchWithTimeout(
  url: string,
  timeoutMs = SERP_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function collectViaSerpApi(keyword: string): Promise<SerpCollectedSnapshot> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) throw new Error("SERPAPI_KEY_not_configured");

  const params = new URLSearchParams({
    q: keyword,
    api_key: apiKey,
    engine: "google",
    gl: SERP_DEFAULT_GL,
    hl: SERP_DEFAULT_HL,
    num: "10",
    google_domain: "google.co.in",
  });

  const res = await fetchWithTimeout(
    `https://serpapi.com/search.json?${params.toString()}`
  );
  if (!res.ok) {
    throw new Error(`serpapi_http_${res.status}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  if (data.error) {
    throw new Error(String(data.error));
  }

  return parseSerpApiResponse(keyword, data);
}

async function collectViaGoogleCse(
  keyword: string
): Promise<SerpCollectedSnapshot> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!apiKey || !cx) throw new Error("google_cse_not_configured");

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: keyword,
    num: "10",
    gl: SERP_DEFAULT_GL,
    hl: SERP_DEFAULT_HL,
  });

  const res = await fetchWithTimeout(
    `https://www.googleapis.com/customsearch/v1?${params.toString()}`
  );
  if (!res.ok) {
    throw new Error(`google_cse_http_${res.status}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  return parseGoogleCseResponse(keyword, data);
}

export async function collectSerpForKeyword(
  keyword: string
): Promise<SerpCollectedSnapshot | null> {
  if (!hasSerpProviderConfigured()) return null;

  if (process.env.SERPAPI_KEY) {
    return collectViaSerpApi(keyword);
  }

  return collectViaGoogleCse(keyword);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
