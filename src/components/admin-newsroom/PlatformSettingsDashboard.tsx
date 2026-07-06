"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CommandPalette } from "@/components/admin-newsroom/platform-settings/CommandPalette";
import { CommandHero } from "@/components/admin-newsroom/platform-settings/CommandHero";
import { HomepageSection } from "@/components/admin-newsroom/platform-settings/HomepageSection";
import { OperationsRail } from "@/components/admin-newsroom/platform-settings/OperationsRail";
import { SettingsSection } from "@/components/admin-newsroom/platform-settings/SettingsSection";
import { AiRecommendations } from "@/components/admin-newsroom/platform-settings/AiRecommendations";
import { ActivityTimeline } from "@/components/admin-newsroom/platform-settings/ActivityTimeline";
import { SyncIndicator } from "@/components/admin-newsroom/platform-settings/SyncIndicator";
import { usePlatformConfig } from "@/components/admin-newsroom/platform-settings/hooks/usePlatformConfig";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import {
  HOMEPAGE_DISPLAY_KEYS,
  PLATFORM_SETTINGS_SECTIONS,
} from "@/lib/platform-admin/settings-schema";
import {
  fuzzyFilterSettings,
  homepageKeyMatchesSearch,
  type SearchableSetting,
} from "@/lib/platform-admin/settings-search";

type PlatformSettingsDashboardProps = {
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
};

export function PlatformSettingsDashboard({
  searchQuery = "",
  onSearchQueryChange,
}: PlatformSettingsDashboardProps) {
  const {
    homepageSections,
    newsroomSettings,
    loading,
    error,
    savingId,
    lastSavedAt,
    cardUpdatedAt,
    toggleSetting,
    toggleHomepage,
    setAllInSection,
    setAllHomepage,
  } = usePlatformConfig();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const effectiveSearch = paletteOpen ? paletteQuery : searchQuery;

  const openCommand = useCallback(() => {
    setPaletteOpen(true);
    setPaletteQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        setPaletteQuery(searchQuery);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchQuery]);

  const hasVisibleSections = useMemo(() => {
    const q = effectiveSearch.trim();
    if (!q) return true;
    if (fuzzyFilterSettings(q).length > 0) return true;
    return HOMEPAGE_DISPLAY_KEYS.some((k) => homepageKeyMatchesSearch(k, q));
  }, [effectiveSearch]);

  const handlePaletteSelect = useCallback(
    (item: SearchableSetting) => {
      onSearchQueryChange?.(item.title);
      const el = sectionRefs.current[item.sectionId];
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [onSearchQueryChange]
  );

  if (loading) {
    return (
      <div className="anr-ps-loading">
        <motion.span
          className="anr-ps-loading__ring"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
        <p className="anr-meta">Initializing command center…</p>
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Platform settings unavailable" hint={error} />;
  }

  return (
    <>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        query={paletteQuery}
        onQueryChange={setPaletteQuery}
        onSelect={handlePaletteSelect}
      />

      <div className="anr-platform-settings anr-platform-settings--command">
        <div className="anr-platform-settings__main">
          <div className="anr-ps-command-bar">
            <SyncIndicator saving={!!savingId} lastSavedAt={lastSavedAt} />
          </div>

          <CommandHero saving={!!savingId} onOpenCommand={openCommand} />

          <p className="anr-meta mb-4">
            <Link href="/admin/settings/organization" className="text-sky-400 hover:underline">
              Organization settings →
            </Link>
            <span className="text-zinc-500"> — footer, contact, JSON-LD, social links</span>
          </p>

          <div className="anr-ps-command-layout">
            <AiRecommendations settings={newsroomSettings} />
            <ActivityTimeline />
          </div>

          {!hasVisibleSections ? (
            <p className="anr-ps-search-empty">No settings match your search.</p>
          ) : (
            <motion.div
              className="anr-ps-sections"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.08 } },
              }}
            >
              <div
                ref={(el) => {
                  sectionRefs.current.homepage = el;
                }}
              >
                <HomepageSection
                  sections={homepageSections}
                  savingKey={savingId}
                  cardUpdatedAt={cardUpdatedAt}
                  onToggle={toggleHomepage}
                  onEnableAll={setAllHomepage}
                  search={effectiveSearch}
                />
              </div>

              {PLATFORM_SETTINGS_SECTIONS.map((section) => (
                <div
                  key={section.id}
                  ref={(el) => {
                    sectionRefs.current[section.id] = el;
                  }}
                >
                  <SettingsSection
                    section={section}
                    settings={newsroomSettings}
                    savingId={savingId}
                    cardUpdatedAt={cardUpdatedAt}
                    onToggle={toggleSetting}
                    onEnableAll={setAllInSection}
                    search={effectiveSearch}
                  />
                </div>
              ))}
            </motion.div>
          )}
        </div>

        <OperationsRail />
      </div>
    </>
  );
}
