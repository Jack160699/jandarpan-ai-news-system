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
import type { FontScale } from "@/lib/reader-preferences";
import type { JdDsStringKey } from "../../i18n/strings";

const SCALES: FontScale[] = ["sm", "base", "lg", "xl"];
const SCALE_KEY: Record<FontScale, JdDsStringKey> = {
  sm: "a11y.scaleSm",
  base: "a11y.scaleBase",
  lg: "a11y.scaleLg",
  xl: "a11y.scaleXl",
};

/** D35 — accessibility + data-saving. */
export function AccessibilityPage() {
  const { t } = useJdDsT();
  const [prefs, setPrefs] = useState<ExperiencePrefs | null>(null);

  useEffect(() => {
    setPrefs(loadExperiencePrefs());
  }, []);

  if (!prefs) {
    return (
      <ReaderShell activeNav="more">
        <Masthead back backHref="/archive" pageTitle={t("a11y.shortTitle")} />
      </ReaderShell>
    );
  }

  const set = (partial: Partial<ExperiencePrefs>) => {
    setPrefs(saveExperiencePrefs(partial));
  };

  const scaleIndex = Math.max(0, SCALES.indexOf(prefs.fontScale));
  const pct = ((scaleIndex + 0.5) / SCALES.length) * 100;

  return (
    <ReaderShell activeNav="more">
      <Masthead back backHref="/archive" pageTitle={t("a11y.shortTitle")} />
      <main id="main-content" role="main" style={{ flex: 1, overflow: "auto" }}>
        <SectionLabel>{t("a11y.dataSection")}</SectionLabel>
        <SettingRow
          icon="wifiOff"
          label={t("a11y.dataSaving")}
          sub={t("a11y.dataSavingSub")}
          toggle={prefs.dataSaving}
          onToggle={(v) => set({ dataSaving: v })}
        />
        <SettingRow
          icon="download"
          label={t("a11y.wifiOnly")}
          toggle={prefs.wifiOnlyDownload}
          onToggle={(v) => set({ wifiOnlyDownload: v })}
        />

        <SectionLabel>{t("a11y.readability")}</SectionLabel>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--jd-line-2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span className="jd-ui" style={{ fontSize: 14, fontWeight: 600, color: "var(--jd-ink)" }}>
              {t("a11y.textSize")}
            </span>
            <span className="jd-ui" style={{ fontSize: 12, fontWeight: 800, color: "var(--jd-red)" }}>
              {t(SCALE_KEY[prefs.fontScale])}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={SCALES.length - 1}
            step={1}
            value={scaleIndex}
            aria-label={t("a11y.textSize")}
            onChange={(e) => set({ fontScale: SCALES[Number(e.target.value)] })}
            style={{ width: "100%", accentColor: "var(--jd-navy)" }}
          />
          <div
            aria-hidden
            style={{
              height: 4,
              borderRadius: 4,
              background: "var(--jd-line)",
              position: "relative",
              marginTop: -10,
              pointerEvents: "none",
              opacity: 0,
            }}
          >
            <div style={{ width: `${pct}%`, height: 4, borderRadius: 4, background: "var(--jd-navy)" }} />
          </div>
        </div>

        <SettingRow
          icon="eye"
          label={t("a11y.highContrast")}
          toggle={prefs.highContrast}
          onToggle={(v) => set({ highContrast: v })}
        />
        <SettingRow
          icon="sun"
          label={t("a11y.darkMode")}
          sub={t("a11y.darkModeSub")}
          right={
            <button
              type="button"
              className="jd-ui"
              onClick={() => {
                const order = ["system", "light", "dark"] as const;
                const i = order.indexOf(prefs.themeMode);
                set({ themeMode: order[(i + 1) % order.length] });
              }}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--jd-red)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {prefs.themeMode === "system"
                ? t("a11y.themeSystem")
                : prefs.themeMode === "dark"
                  ? t("a11y.themeDark")
                  : t("a11y.themeLight")}
            </button>
          }
        />
        <SettingRow
          icon="globe"
          label={t("a11y.screenReader")}
          sub={t("a11y.screenReaderSub")}
          toggle={prefs.screenReaderOptimized}
          onToggle={(v) => set({ screenReaderOptimized: v })}
        />
      </main>
    </ReaderShell>
  );
}
