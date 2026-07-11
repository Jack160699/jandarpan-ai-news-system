"use client";

import { useMemo } from "react";
import { useHomepageLayout } from "@/hooks/useHomepageLayout";
import { getContinueTarget, getContinueTargets } from "@/lib/reading-memory";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import type {
  ProfileHistoryItem,
  ProfileSavedItem,
  ProfileV3Data,
} from "../types";

function slugToLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function useProfileV3Data(): ProfileV3Data {
  const account = useReaderAccount();
  const { prefs: readerPrefs } = useReaderPreferences();
  const { layout } = useHomepageLayout();
  const ctx = useEditorialIntelligenceOptional();

  const memory = ctx?.memory;
  const articles = memory?.articles ?? {};

  const continueTarget = useMemo(() => {
    if (!memory) return null;
    const target = getContinueTarget(memory);
    if (!target) return null;
    return {
      href: target.href,
      label: target.label,
      progress: target.progress,
    };
  }, [memory]);

  const continueList = useMemo(() => {
    if (!memory) return [];
    return getContinueTargets(memory, 4).map((item) => ({
      href: item.href,
      label: item.label,
      progress: item.progress,
    }));
  }, [memory]);

  const history = useMemo((): ProfileHistoryItem[] => {
    return Object.entries(articles)
      .filter(([, data]) => data.lastRead)
      .sort((a, b) => b[1].lastRead - a[1].lastRead)
      .slice(0, 8)
      .map(([slug, data]) => ({
        slug,
        title: data.title?.trim() || slugToLabel(slug),
        progress: data.progress,
        lastRead: data.lastRead,
      }));
  }, [articles]);

  const saved = useMemo((): ProfileSavedItem[] => {
    const bookmarks = memory?.bookmarks ?? [];
    return bookmarks.map((slug) => {
      const progress = articles[slug];
      const title = progress?.title?.trim() || slugToLabel(slug);
      const pct =
        progress && progress.progress > 0
          ? Math.round(progress.progress * 100)
          : null;
      return { slug, title, progress: pct };
    });
  }, [memory?.bookmarks, articles]);

  return {
    mounted: account.mounted,
    isLoggedIn: account.isLoggedIn,
    displayName: account.displayName,
    avatarInitial: account.avatarInitial,
    isPremium: account.isPremium,
    email: account.user?.email ?? null,
    streakDays: account.streakDays,
    savedCount: account.savedCount,
    interests: account.interests,
    homeDistrict: readerPrefs.homeDistrict ?? null,
    followedDistricts: layout.followedDistricts,
    continueTarget,
    continueList,
    history,
    saved,
    articles,
  };
}
