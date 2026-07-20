"use client";

import { useEffect, useState } from "react";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { SectionLabel, SettingRow } from "../components/SettingRow";
import { useJdDsT } from "../../i18n";
import {
  loadExperiencePrefs,
  saveExperiencePrefs,
  type ExperiencePrefs,
} from "../prefs";
import { loadPreferences } from "@/lib/reader-preferences";
import { CG_DISTRICTS } from "@/lib/regional/districts";

/** D33 — notification preferences. */
export function NotificationPrefsPage() {
  const { t, locale } = useJdDsT();
  const [prefs, setPrefs] = useState<ExperiencePrefs | null>(null);
  const [districtLabel, setDistrictLabel] = useState("");

  useEffect(() => {
    setPrefs(loadExperiencePrefs());
    const d = CG_DISTRICTS.find((x) => x.slug === loadPreferences().homeDistrict);
    setDistrictLabel(
      locale === "en" ? (d?.name ?? "Raipur") : (d?.nameHi ?? d?.name ?? "रायपुर")
    );
  }, [locale]);

  if (!prefs) {
    return (
      <ReaderShell activeNav="more">
        <Masthead back backHref="/archive" pageTitle={t("notifications.shortTitle")} />
      </ReaderShell>
    );
  }

  const set = (partial: Partial<ExperiencePrefs>) => {
    setPrefs(saveExperiencePrefs(partial));
  };

  return (
    <ReaderShell activeNav="more">
      <Masthead back backHref="/archive" pageTitle={t("notifications.shortTitle")} />
      <main id="main-content" role="main" style={{ flex: 1, overflow: "auto" }}>
        <SectionLabel>{t("notify.pushSection")}</SectionLabel>
        <SettingRow
          label={t("notify.breaking")}
          sub={t("notify.breakingSub")}
          toggle={prefs.notifyBreaking}
          onToggle={(v) => set({ notifyBreaking: v })}
        />
        <SettingRow
          label={t("notify.district")}
          sub={districtLabel}
          toggle={prefs.notifyDistrict}
          onToggle={(v) => set({ notifyDistrict: v })}
        />
        <SettingRow
          label={t("notify.followed")}
          toggle={prefs.notifyFollowed}
          onToggle={(v) => set({ notifyFollowed: v })}
        />
        <SettingRow
          label={t("notify.briefing")}
          sub={t("notify.briefingSub")}
          toggle={prefs.notifyBriefing}
          onToggle={(v) => set({ notifyBriefing: v })}
        />
        <SettingRow
          label={t("notify.offers")}
          toggle={prefs.notifyOffers}
          onToggle={(v) => set({ notifyOffers: v })}
        />
        <SectionLabel>{t("notify.quietSection")}</SectionLabel>
        <SettingRow
          label={t("notify.quiet")}
          sub={t("notify.quietSub")}
          toggle={prefs.quietHours}
          onToggle={(v) => set({ quietHours: v })}
        />
      </main>
    </ReaderShell>
  );
}
