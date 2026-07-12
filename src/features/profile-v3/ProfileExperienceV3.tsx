"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/layouts/PageContainer";
import { EditionLineage } from "@/components/institution";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useProfileV3Data } from "./hooks/useProfileV3Data";
import { ProfileNav, type ProfileNavItem } from "./components/ProfileNav";
import { PersonalDashboard } from "./components/PersonalDashboard";
import { ReadingHistorySection } from "./components/ReadingHistorySection";
import { SavedStoriesSection } from "./components/SavedStoriesSection";
import { ReadingStreakSection } from "./components/ReadingStreakSection";
import { FollowedTopicsSection } from "./components/FollowedTopicsSection";
import { FollowedDistrictsSection } from "./components/FollowedDistrictsSection";
import { AiPreferencesSection } from "./components/AiPreferencesSection";
import { NotificationPreferencesSection } from "./components/NotificationPreferencesSection";
import { LanguageSettingsSection } from "./components/LanguageSettingsSection";
import { AppearanceSettingsSection } from "./components/AppearanceSettingsSection";
import { PrivacySettingsSection } from "./components/PrivacySettingsSection";
import { ProfileV3PrefsProvider } from "./hooks/useProfileV3Prefs";
import { ProfileV3Skeleton } from "./skeletons/ProfileV3Skeleton";
import type { ProfileExperienceV3Props, ProfileV3SectionId } from "./types";
import "./styles/profile-v3.css";

/**
 * JDP-014 — Profile Experience V3
 *
 * Presentation layer over existing reader session, preferences, and reading memory.
 */
function ProfileExperienceV3Inner({
  simulateLoadMs = 0,
}: ProfileExperienceV3Props) {
  const { language, t } = useLanguage();
  const data = useProfileV3Data();
  const [phase, setPhase] = useState<"loading" | "ready">(
    simulateLoadMs > 0 || !data.mounted ? "loading" : "ready"
  );
  const [activeSection, setActiveSection] = useState<ProfileV3SectionId>(
    "personal-dashboard"
  );

  useEffect(() => {
    if (simulateLoadMs > 0) {
      const timer = window.setTimeout(() => setPhase("ready"), simulateLoadMs);
      return () => window.clearTimeout(timer);
    }
    if (data.mounted) setPhase("ready");
    return undefined;
  }, [simulateLoadMs, data.mounted]);

  useEffect(() => {
    if (phase !== "ready") return undefined;
    const hash = window.location.hash.replace("#", "") as ProfileV3SectionId;
    if (hash) {
      setActiveSection(hash);
      requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
      });
    }
    return undefined;
  }, [phase]);

  useEffect(() => {
    if (phase !== "ready") return undefined;

    const sectionIds: ProfileV3SectionId[] = [
      "personal-dashboard",
      "reading-history",
      "saved-stories",
      "reading-streak",
      "followed-topics",
      "followed-districts",
      "ai-preferences",
      "notification-preferences",
      "language-settings",
      "appearance-settings",
      "privacy-settings",
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target.id as ProfileV3SectionId | undefined;
        if (top && sectionIds.includes(top)) setActiveSection(top);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5] }
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [phase]);

  const navItems = useMemo((): ProfileNavItem[] => {
    return [
      {
        id: "personal-dashboard",
        label: pickBilingualLabel(language, "Dashboard", "डैशबोर्ड"),
      },
      {
        id: "reading-history",
        label: pickBilingualLabel(language, "History", "इतिहास"),
      },
      {
        id: "saved-stories",
        label: pickBilingualLabel(language, "Saved", "सेव"),
      },
      {
        id: "reading-streak",
        label: pickBilingualLabel(language, "Streak", "लकीर"),
      },
      {
        id: "followed-topics",
        label: pickBilingualLabel(language, "Topics", "विषय"),
      },
      {
        id: "followed-districts",
        label: pickBilingualLabel(language, "Districts", "जिले"),
      },
      {
        id: "ai-preferences",
        label: pickBilingualLabel(language, "AI", "एआई"),
      },
      {
        id: "notification-preferences",
        label: pickBilingualLabel(language, "Alerts", "अलर्ट"),
      },
      {
        id: "language-settings",
        label: pickBilingualLabel(language, "Language", "भाषा"),
      },
      {
        id: "appearance-settings",
        label: pickBilingualLabel(language, "Appearance", "दिखावट"),
      },
      {
        id: "privacy-settings",
        label: pickBilingualLabel(language, "Privacy", "गोपनीयता"),
      },
    ];
  }, [language]);

  const handleNavSelect = useCallback((id: ProfileV3SectionId) => {
    setActiveSection(id);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
    }
  }, []);

  if (phase === "loading") {
    return (
      <PageContainer width="default" className="pv3-page" data-testid="profile-v3">
        <ProfileV3Skeleton />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      width="default"
      className="pv3-page"
      data-testid="profile-v3"
      data-narrative-root
    >
        <header className="pv3-hero">
          <Link href="/" className="pv3-hero__back">
            {t.archive.backToEdition}
          </Link>
          <h1 className="pv3-hero__title">{t.profile.title}</h1>
          <p className="pv3-hero__subtitle">{t.profile.subtitle}</p>
          <EditionLineage className="pv3-hero__lineage" />
        </header>

        <div className="pv3-layout">
          <aside className="pv3-layout__nav" aria-label={pickBilingualLabel(language, "Section navigation", "सेक्शन नेविगेशन")}>
            <ProfileNav
              items={navItems}
              activeId={activeSection}
              onSelect={handleNavSelect}
            />
          </aside>

          <div className="pv3-layout__content">
            <PersonalDashboard data={data} />
            <ReadingHistorySection data={data} />
            <SavedStoriesSection data={data} />
            <ReadingStreakSection data={data} />
            <FollowedTopicsSection data={data} />
            <FollowedDistrictsSection data={data} />
            <AiPreferencesSection />
            <NotificationPreferencesSection />
            <LanguageSettingsSection />
            <AppearanceSettingsSection />
            <PrivacySettingsSection />
          </div>
        </div>
    </PageContainer>
  );
}

export function ProfileExperienceV3(props: ProfileExperienceV3Props) {
  return (
    <ProfileV3PrefsProvider>
      <ProfileExperienceV3Inner {...props} />
    </ProfileV3PrefsProvider>
  );
}
