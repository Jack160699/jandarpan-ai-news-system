"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePlatformConfig } from "@/components/admin-newsroom/platform-settings/hooks/usePlatformConfig";
import {
  PLATFORM_SETTINGS_SECTIONS,
  HOMEPAGE_SECTION_META,
} from "@/lib/platform-admin/settings-schema";
import {
  Av3Panel,
  Av3SkeletonGrid,
  Av3Stack,
  Av3StatusBadge,
} from "@/components/admin-v3";

type Av3SettingsDashboardProps = {
  searchQuery?: string;
};

const SECTION_ORDER = [
  { id: "general", title: "General", subtitle: "Core newsroom operating switches" },
  { id: "organisation", title: "Organisation", subtitle: "Footer, contact, and public identity" },
  { id: "branding", title: "Branding", subtitle: "Presentation modules shown to readers" },
  { id: "homepage", title: "Homepage modules", subtitle: "Homepage section visibility" },
  { id: "languages", title: "Languages", subtitle: "Reader language and translation controls" },
  { id: "editorial", title: "Editorial rules", subtitle: "Desk and publishing behaviour" },
  { id: "notifications", title: "Notifications", subtitle: "Alert and distribution preferences" },
  { id: "integrations", title: "Integrations", subtitle: "Providers and inbound systems" },
  { id: "advanced", title: "Advanced", subtitle: "Infrastructure and AI systems" },
] as const;

function mapLegacySection(id: string): (typeof SECTION_ORDER)[number]["id"] {
  if (id === "homepage") return "homepage";
  if (id.includes("ai") || id.includes("pipeline") || id.includes("infra")) return "advanced";
  if (id.includes("notif") || id.includes("push") || id.includes("alert")) return "notifications";
  if (id.includes("lang") || id.includes("translat")) return "languages";
  if (id.includes("editorial") || id.includes("desk") || id.includes("publish")) return "editorial";
  if (id.includes("brand") || id.includes("theme")) return "branding";
  if (id.includes("integ") || id.includes("rss") || id.includes("provider")) return "integrations";
  return "general";
}

export function Av3SettingsDashboard({ searchQuery = "" }: Av3SettingsDashboardProps) {
  const {
    loading,
    error,
    toggleSetting,
    toggleHomepage,
    savingId,
    homepageSections,
    newsroomSettings,
  } = usePlatformConfig();
  const [openSection, setOpenSection] = useState<string>("general");
  const needle = searchQuery.trim().toLowerCase();

  const grouped = useMemo(() => {
    const buckets = new Map<string, typeof PLATFORM_SETTINGS_SECTIONS>();
    for (const section of PLATFORM_SETTINGS_SECTIONS) {
      const bucket = mapLegacySection(section.id);
      const list = buckets.get(bucket) ?? [];
      list.push(section);
      buckets.set(bucket, list);
    }
    return buckets;
  }, []);

  if (loading) {
    return (
      <Av3Stack>
        <Av3SkeletonGrid count={6} />
      </Av3Stack>
    );
  }

  if (error) {
    return (
      <Av3Panel title="Settings unavailable">
        <p className="av3-note">{error}</p>
      </Av3Panel>
    );
  }

  return (
    <Av3Stack className="av3-settings">
      <Av3Panel
        title="Configuration"
        subtitle="Admin V3 settings — operational metrics live in Command Centre and Platform."
      >
        <div className="av3-owner-links">
          <Link href="/admin/settings/organization">Organisation settings</Link>
          <Link href="/admin/overview">Command Centre</Link>
          <Link href="/admin/health">Platform health</Link>
        </div>
      </Av3Panel>

      {SECTION_ORDER.map((section) => {
        if (section.id === "organisation") {
          return (
            <Av3Panel
              key={section.id}
              title={section.title}
              subtitle={section.subtitle}
              action={
                <Link href="/admin/settings/organization" className="av3-panel-link">
                  Open
                </Link>
              }
            >
              <p className="av3-note">
                Footer, contact, JSON-LD and social links are managed on the organisation page.
              </p>
            </Av3Panel>
          );
        }

        if (section.id === "homepage") {
          const entries = Object.entries(HOMEPAGE_SECTION_META).filter(([key, meta]) => {
            if (!needle) return true;
            return (
              key.includes(needle) ||
              meta.title.toLowerCase().includes(needle) ||
              meta.description.toLowerCase().includes(needle)
            );
          });
          return (
            <Av3Panel key={section.id} title={section.title} subtitle={section.subtitle}>
              {entries.length === 0 ? (
                <p className="av3-note">No matching modules. Try another search term.</p>
              ) : (
                <ul className="av3-settings-list">
                  {entries.map(([key, meta]) => {
                    const enabled = Boolean(
                      homepageSections.find((s) => s.key === key)?.enabled ?? true
                    );
                    return (
                      <li key={key} className="av3-settings-row">
                        <div>
                          <strong>{meta.title}</strong>
                          <p>{meta.description}</p>
                        </div>
                        <button
                          type="button"
                          className="anr-btn anr-btn--ghost"
                          disabled={savingId === key}
                          onClick={() =>
                            void toggleHomepage(key as (typeof homepageSections)[number]["key"])
                          }
                        >
                          {enabled ? "On" : "Off"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Av3Panel>
          );
        }

        const legacySections = grouped.get(section.id) ?? [];
        const cards = legacySections.flatMap((s) =>
          s.cards.filter((card) => {
            if (!needle) return true;
            return (
              card.title.toLowerCase().includes(needle) ||
              card.description.toLowerCase().includes(needle) ||
              card.id.toLowerCase().includes(needle)
            );
          })
        );

        if (cards.length === 0 && needle) return null;

        const collapsed = openSection !== section.id;
        return (
          <Av3Panel
            key={section.id}
            title={section.title}
            subtitle={section.subtitle}
            action={
              <button
                type="button"
                className="anr-btn anr-btn--ghost"
                onClick={() => setOpenSection(collapsed ? section.id : "")}
              >
                {collapsed ? "Expand" : "Collapse"}
              </button>
            }
          >
            {collapsed ? (
              <p className="av3-note">{cards.length} configuration items</p>
            ) : cards.length === 0 ? (
              <p className="av3-note">Nothing configured in this group yet.</p>
            ) : (
              <ul className="av3-settings-list">
                {cards.map((card) => {
                  const enabled = Boolean(newsroomSettings[card.id] ?? card.defaultEnabled);
                  return (
                    <li key={card.id} className="av3-settings-row">
                      <div>
                        <strong>{card.title}</strong>
                        <p>{card.description}</p>
                        <Av3StatusBadge
                          tone={enabled ? "healthy" : "neutral"}
                          label={
                            card.statusLabel?.(enabled) ?? (enabled ? "Enabled" : "Disabled")
                          }
                        />
                      </div>
                      <button
                        type="button"
                        className="anr-btn anr-btn--ghost"
                        disabled={savingId === card.id}
                        onClick={() => void toggleSetting(card.id)}
                      >
                        {enabled ? "On" : "Off"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Av3Panel>
        );
      })}
    </Av3Stack>
  );
}
