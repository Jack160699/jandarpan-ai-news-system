/**
 * Google Search Console API v3 client — official API only
 */

import {
  GSC_FETCH_TIMEOUT_MS,
  getGscSiteUrl,
} from "@/lib/gsc-intelligence/config";
import { getGscAccessToken } from "@/lib/gsc-intelligence/auth";
import type { GscAnalyticsRow } from "@/lib/gsc-intelligence/types";

const API_BASE = "https://www.googleapis.com/webmasters/v3";

export interface SearchAnalyticsRequest {
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
  type?: "web" | "image" | "video" | "news";
  dataState?: "final" | "all";
}

export interface GscSitemapInfo {
  path: string;
  lastSubmitted?: string;
  isPending?: boolean;
  isSitemapsIndex?: boolean;
  type?: string;
  lastDownloaded?: string;
  warnings?: number;
  errors?: number;
  contents?: Array<{ type: string; submitted: number; indexed: number }>;
}

async function gscFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = await getGscAccessToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GSC_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`gsc_api_${res.status}:${text.slice(0, 200)}`);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function encodedSiteUrl(): string {
  return encodeURIComponent(getGscSiteUrl());
}

export async function querySearchAnalytics(
  request: SearchAnalyticsRequest
): Promise<GscAnalyticsRow[]> {
  const data = await gscFetch<{ rows?: Array<Record<string, unknown>> }>(
    `/sites/${encodedSiteUrl()}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: request.startDate,
        endDate: request.endDate,
        dimensions: request.dimensions ?? [],
        rowLimit: request.rowLimit ?? 250,
        type: request.type ?? "web",
        dataState: request.dataState ?? "final",
      }),
    }
  );

  return (data.rows ?? []).map((row) => ({
    keys: Array.isArray(row.keys) ? (row.keys as string[]) : [],
    clicks: Number(row.clicks ?? 0),
    impressions: Number(row.impressions ?? 0),
    ctr: Number(row.ctr ?? 0),
    position: Number(row.position ?? 0),
  }));
}

export async function listSitemaps(): Promise<GscSitemapInfo[]> {
  const data = await gscFetch<{ sitemap?: GscSitemapInfo[] }>(
    `/sites/${encodedSiteUrl()}/sitemaps`
  );
  return data.sitemap ?? [];
}

export function formatGscDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function daysAgo(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - days);
  return formatGscDate(d);
}
