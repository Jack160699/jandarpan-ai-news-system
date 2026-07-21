"use client";

import { useEffect, useState } from "react";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import type { MandiApiJson } from "../utilities/types";

type MandiClientState =
  | { status: "loading" }
  | { status: "unavailable"; reason?: string }
  | { status: "available"; data: MandiApiJson };

const CACHE_PREFIX = "jd-a1-mandi-";
const CACHE_TTL_MS = 45 * 60 * 1000;

function cacheKey(slug: string) {
  return `${CACHE_PREFIX}${slug}`;
}

function readCache(slug: string): MandiApiJson | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: MandiApiJson };
    if (!parsed?.at || Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(slug: string, data: MandiApiJson) {
  try {
    sessionStorage.setItem(cacheKey(slug), JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* ignore */
  }
}

/**
 * Client mandi rates for A1 — `/api/utilities/mandi` only (never calls data.gov.in).
 */
export function useMandiRates(districtSlug?: string | null) {
  const { prefs } = useReaderPreferences();
  const slug = (districtSlug ?? prefs.homeDistrict ?? "raipur").toLowerCase();
  const [state, setState] = useState<MandiClientState>(() => {
    if (typeof window === "undefined") return { status: "loading" };
    const cached = readCache(slug);
    return cached?.status === "available"
      ? { status: "available", data: cached }
      : { status: "loading" };
  });

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    fetch(`/api/utilities/mandi?district=${encodeURIComponent(slug)}&limit=5`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok || r.status === 400 ? r.json() : null))
      .then((data: MandiApiJson | null) => {
        if (cancelled) return;
        if (!data || typeof data !== "object") {
          setState({ status: "unavailable", reason: "provider_error" });
          return;
        }
        if (data.status === "available" && Array.isArray(data.rates) && data.rates.length) {
          writeCache(slug, data);
          setState({ status: "available", data });
          return;
        }
        setState({ status: "unavailable", reason: data.reason });
      })
      .catch(() => {
        if (!cancelled && !controller.signal.aborted) {
          setState({ status: "unavailable", reason: "provider_error" });
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [slug]);

  return state;
}
