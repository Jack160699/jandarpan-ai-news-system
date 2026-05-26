"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Power, PowerOff } from "lucide-react";
import { useState } from "react";
import { SettingsCard } from "@/components/admin-newsroom/platform-settings/SettingsCard";
import type { PlatformSectionConfig } from "@/lib/newsroom-platform/content/types";
import {
  HOMEPAGE_DISPLAY_KEYS,
  HOMEPAGE_SECTION_META,
} from "@/lib/platform-admin/settings-schema";
import { homepageKeyMatchesSearch } from "@/lib/platform-admin/settings-search";

export function HomepageSection({
  sections,
  savingKey,
  cardUpdatedAt,
  onToggle,
  onEnableAll,
  search,
}: {
  sections: PlatformSectionConfig[];
  savingKey: string | null;
  cardUpdatedAt: Record<string, string>;
  onToggle: (key: PlatformSectionConfig["key"]) => void;
  onEnableAll: (enabled: boolean) => void;
  search: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const keys = HOMEPAGE_DISPLAY_KEYS.filter((k) => homepageKeyMatchesSearch(k, search));
  if (!keys.length) return null;

  const allOn = keys.every(
    (k) => sections.find((s) => s.key === k)?.enabled !== false
  );

  return (
    <section className="anr-ps-section" aria-labelledby="ps-section-homepage">
      <header className="anr-ps-section__head anr-ps-section__head--sticky">
        <div className="anr-ps-section__head-main">
          <button
            type="button"
            className="anr-ps-section__collapse"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!collapsed}
          >
            <motion.span animate={{ rotate: collapsed ? -90 : 0 }}>
              <ChevronDown size={16} />
            </motion.span>
          </button>
          <div>
            <h3 id="ps-section-homepage">Homepage Modules</h3>
            <p>Control which rails appear on the public homepage experience.</p>
          </div>
        </div>
        <div className="anr-ps-section__actions">
          <button
            type="button"
            className="anr-ps-btn-ghost"
            onClick={() => onEnableAll(!allOn)}
            disabled={savingKey === "homepage-bulk"}
          >
            {allOn ? <PowerOff size={13} /> : <Power size={13} />}
            {allOn ? "Disable all" : "Enable all"}
          </button>
        </div>
      </header>
      <div className="anr-ps-section__divider" aria-hidden />
      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.div
            className="anr-ps-grid"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {keys.map((key, i) => {
              const meta = HOMEPAGE_SECTION_META[key];
              const enabled = sections.find((s) => s.key === key)?.enabled !== false;
              return (
                <SettingsCard
                  key={key}
                  id={key}
                  title={meta.title}
                  description={meta.description}
                  icon={meta.icon}
                  enabled={enabled}
                  saving={savingKey === key || savingKey === "homepage-bulk"}
                  statusText={enabled ? "Live on homepage" : "Hidden"}
                  updatedAt={cardUpdatedAt[key]}
                  onToggle={() => onToggle(key)}
                  index={i}
                />
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
