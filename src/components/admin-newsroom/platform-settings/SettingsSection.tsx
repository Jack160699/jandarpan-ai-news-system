"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Power, PowerOff } from "lucide-react";
import { useState } from "react";
import { SettingsCard } from "@/components/admin-newsroom/platform-settings/SettingsCard";
import type { SettingsCardDef, SettingsSectionDef } from "@/lib/platform-admin/settings-schema";
import { cardMatchesSearch } from "@/lib/platform-admin/settings-search";

export function SettingsSection({
  section,
  settings,
  savingId,
  cardUpdatedAt,
  onToggle,
  onEnableAll,
  search,
}: {
  section: SettingsSectionDef;
  settings: Record<string, boolean>;
  savingId: string | null;
  cardUpdatedAt: Record<string, string>;
  onToggle: (id: string) => void;
  onEnableAll: (ids: string[], enabled: boolean) => void;
  search: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const cards = section.cards.filter((c) =>
    cardMatchesSearch(c, section.title, search)
  );

  if (!cards.length) return null;

  const allOn = cards.every((c) => settings[c.id] ?? c.defaultEnabled);

  return (
    <section className="anr-ps-section" aria-labelledby={`ps-section-${section.id}`}>
      <header className="anr-ps-section__head anr-ps-section__head--sticky">
        <div className="anr-ps-section__head-main">
          <button
            type="button"
            className="anr-ps-section__collapse"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!collapsed}
            aria-controls={`ps-panel-${section.id}`}
          >
            <motion.span animate={{ rotate: collapsed ? -90 : 0 }}>
              <ChevronDown size={16} />
            </motion.span>
          </button>
          <div>
            <h3 id={`ps-section-${section.id}`}>{section.title}</h3>
            <p>{section.subtitle}</p>
          </div>
        </div>
        <div className="anr-ps-section__actions">
          <button
            type="button"
            className="anr-ps-btn-ghost"
            onClick={() =>
              onEnableAll(
                cards.map((c) => c.id),
                !allOn
              )
            }
            disabled={savingId === "bulk"}
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
            id={`ps-panel-${section.id}`}
            className="anr-ps-grid"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24 }}
          >
            {cards.map((card, i) => (
              <SettingsCardView
                key={card.id}
                card={card}
                enabled={settings[card.id] ?? card.defaultEnabled}
                saving={savingId === card.id || savingId === "bulk"}
                updatedAt={cardUpdatedAt[card.id]}
                onToggle={() => onToggle(card.id)}
                index={i}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function SettingsCardView({
  card,
  enabled,
  saving,
  updatedAt,
  onToggle,
  index,
}: {
  card: SettingsCardDef;
  enabled: boolean;
  saving: boolean;
  updatedAt?: string;
  onToggle: () => void;
  index: number;
}) {
  const statusText = card.statusLabel?.(enabled) ?? (enabled ? "Active" : "Inactive");
  return (
    <SettingsCard
      id={card.id}
      title={card.title}
      description={card.description}
      icon={card.icon}
      enabled={enabled}
      saving={saving}
      statusText={statusText}
      updatedAt={updatedAt}
      onToggle={onToggle}
      index={index}
    />
  );
}
