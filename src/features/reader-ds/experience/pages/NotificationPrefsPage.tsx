"use client";

import { useEffect, useState } from "react";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { SectionLabel, SettingRow } from "../components/SettingRow";
import {
  loadExperiencePrefs,
  saveExperiencePrefs,
  type ExperiencePrefs,
} from "../prefs";
import { loadPreferences } from "@/lib/reader-preferences";
import { CG_DISTRICTS } from "@/lib/regional/districts";

/** D33 — notification preferences. */
export function NotificationPrefsPage() {
  const [prefs, setPrefs] = useState<ExperiencePrefs | null>(null);
  const [districtLabel, setDistrictLabel] = useState("रायपुर");

  useEffect(() => {
    setPrefs(loadExperiencePrefs());
    const d = CG_DISTRICTS.find((x) => x.slug === loadPreferences().homeDistrict);
    setDistrictLabel(d?.nameHi ?? d?.name ?? "रायपुर");
  }, []);

  if (!prefs) {
    return (
      <ReaderShell activeNav="more">
        <Masthead back backHref="/archive" pageTitle="सूचनाएँ" />
      </ReaderShell>
    );
  }

  const set = (partial: Partial<ExperiencePrefs>) => {
    setPrefs(saveExperiencePrefs(partial));
  };

  return (
    <ReaderShell activeNav="more">
      <Masthead back backHref="/archive" pageTitle="सूचनाएँ" />
      <main id="main-content" role="main" style={{ flex: 1, overflow: "auto" }}>
        <SectionLabel>पुश सूचनाएँ</SectionLabel>
        <SettingRow
          label="ब्रेकिंग न्यूज़"
          sub="तुरंत अलर्ट"
          toggle={prefs.notifyBreaking}
          onToggle={(v) => set({ notifyBreaking: v })}
        />
        <SettingRow
          label="मेरे ज़िले की ख़बरें"
          sub={districtLabel}
          toggle={prefs.notifyDistrict}
          onToggle={(v) => set({ notifyDistrict: v })}
        />
        <SettingRow
          label="फ़ॉलो किए टॉपिक"
          toggle={prefs.notifyFollowed}
          onToggle={(v) => set({ notifyFollowed: v })}
        />
        <SettingRow
          label="दैनिक ऑडियो ब्रीफ़िंग"
          sub="सुबह 7:00"
          toggle={prefs.notifyBriefing}
          onToggle={(v) => set({ notifyBriefing: v })}
        />
        <SettingRow
          label="सदस्यता व ऑफ़र"
          toggle={prefs.notifyOffers}
          onToggle={(v) => set({ notifyOffers: v })}
        />
        <SectionLabel>शांत घंटे</SectionLabel>
        <SettingRow
          label="रात में सूचनाएँ रोकें"
          sub="रात 10:00 – सुबह 6:00"
          toggle={prefs.quietHours}
          onToggle={(v) => set({ quietHours: v })}
        />
      </main>
    </ReaderShell>
  );
}
