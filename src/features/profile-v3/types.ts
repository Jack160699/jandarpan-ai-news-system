/**
 * JDP-014 — Profile Experience V3 types
 */

import type { ArticleProgress } from "@/lib/reading-memory";

export type ProfileV3SectionId =
  | "personal-dashboard"
  | "reading-history"
  | "saved-stories"
  | "reading-streak"
  | "followed-topics"
  | "followed-districts"
  | "ai-preferences"
  | "notification-preferences"
  | "language-settings"
  | "appearance-settings"
  | "privacy-settings";

export type ProfileContinueTarget = {
  href: string;
  label: string;
  progress: number;
};

export type ProfileHistoryItem = {
  slug: string;
  title: string;
  progress: number;
  lastRead: number;
};

export type ProfileSavedItem = {
  slug: string;
  title: string;
  progress: number | null;
};

export type ProfileDashboardStats = {
  streakDays: number;
  savedCount: number;
  topicsCount: number;
  districtsCount: number;
  recentReadsCount: number;
};

export type ProfileV3Prefs = {
  aiSummaryEnabled: boolean;
  aiAssistantEnabled: boolean;
  aiVoiceEnabled: boolean;
  breakingAlerts: boolean;
  liveDeskAlerts: boolean;
  morningBriefAlerts: boolean;
  analyticsOptOut: boolean;
  showReadingHistory: boolean;
  personalizedFeed: boolean;
};

export type ProfileV3Data = {
  mounted: boolean;
  isLoggedIn: boolean;
  displayName: string;
  avatarInitial: string;
  isPremium: boolean;
  email: string | null;
  streakDays: number;
  savedCount: number;
  interests: string[];
  homeDistrict: string | null;
  followedDistricts: string[];
  continueTarget: ProfileContinueTarget | null;
  continueList: ProfileContinueTarget[];
  history: ProfileHistoryItem[];
  saved: ProfileSavedItem[];
  articles: Record<string, ArticleProgress>;
};

export type ProfileExperienceV3Props = {
  /** Simulate initial hydration delay for skeleton demo */
  simulateLoadMs?: number;
};
