import { cookies } from "next/headers";
import type { HomeSectionId } from "@/lib/homepage/types";
import type { RankingPersonalization } from "@/lib/news/ai/ranking";
import { buildTenantRegionalPersonalization } from "@/lib/tenant/personalization";
import type { TenantConfig } from "@/lib/tenant/types";
import { getDistrict } from "@/lib/regional/districts";
import {
  DISTRICT_COOKIE,
  ONBOARDING_COOKIE,
  RECENT_READS_COOKIE,
} from "@/lib/personalization/cookies";

export type ReaderPersonalizationPrefs = {
  interestSections: HomeSectionId[];
  homeDistrict: string | null;
  recentReadSlugs: string[];
};

export async function getReaderPersonalizationPrefs(): Promise<ReaderPersonalizationPrefs> {
  const { getServerPreferredSections } = await import(
    "@/lib/super-menu/server-interests"
  );
  const interestSections = await getServerPreferredSections();
  const homeDistrict = await getServerHomeDistrict();
  const recentReadSlugs = await getServerRecentReadSlugs();
  return { interestSections, homeDistrict, recentReadSlugs };
}

export function personalizationCacheSignature(
  prefs: ReaderPersonalizationPrefs
): string {
  return [
    prefs.interestSections.slice().sort().join(","),
    prefs.homeDistrict ?? "",
    prefs.recentReadSlugs.join(","),
  ].join("|");
}

export function buildRankingPersonalizationFromPrefs(
  prefs: ReaderPersonalizationPrefs,
  tenant: TenantConfig
): RankingPersonalization {
  const personalization = buildTenantRegionalPersonalization(tenant, {
    homeDistrict: prefs.homeDistrict,
  });
  if (prefs.interestSections.length) {
    personalization.preferredSections = [
      ...new Set([
        ...prefs.interestSections,
        ...(personalization.preferredSections ?? []),
      ]),
    ];
  }
  if (prefs.recentReadSlugs.length) {
    personalization.boostSlugs = [
      ...new Set([
        ...prefs.recentReadSlugs,
        ...(personalization.boostSlugs ?? []),
      ]),
    ].slice(0, 12);
  }
  return personalization;
}


function readJsonCookie(raw: string | undefined): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

export async function getServerHomeDistrict(): Promise<string | null> {
  try {
    const jar = await cookies();
    const slug = jar.get(DISTRICT_COOKIE)?.value?.trim().toLowerCase();
    if (!slug || !getDistrict(slug)) return null;
    return slug;
  } catch {
    return null;
  }
}

export async function getServerRecentReadSlugs(): Promise<string[]> {
  try {
    const jar = await cookies();
    const parsed = readJsonCookie(jar.get(RECENT_READS_COOKIE)?.value);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string").slice(0, 8)
      : [];
  } catch {
    return [];
  }
}

export async function getServerOnboardingDone(): Promise<boolean> {
  try {
    const jar = await cookies();
    return jar.get(ONBOARDING_COOKIE)?.value === "1";
  } catch {
    return false;
  }
}
