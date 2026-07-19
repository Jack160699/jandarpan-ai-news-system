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
import type { FontScale } from "@/lib/reader-preferences";

const SCALES: FontScale[] = ["sm", "base", "lg", "xl"];
const SCALE_LABEL: Record<FontScale, string> = {
  sm: "छोटा",
  base: "सामान्य",
  lg: "बड़ा",
  xl: "बहुत बड़ा",
};

/** D35 — accessibility + data-saving. */
export function AccessibilityPage() {
  const [prefs, setPrefs] = useState<ExperiencePrefs | null>(null);

  useEffect(() => {
    setPrefs(loadExperiencePrefs());
  }, []);

  if (!prefs) {
    return (
      <ReaderShell activeNav="more">
        <Masthead back backHref="/archive" pageTitle="सुगम्यता" />
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
      <Masthead back backHref="/archive" pageTitle="सुगम्यता" />
      <main id="main-content" role="main" style={{ flex: 1, overflow: "auto" }}>
        <SectionLabel>डेटा-बचत</SectionLabel>
        <SettingRow
          icon="wifiOff"
          label="डेटा-बचत मोड"
          sub="इमेज मांग पर, हल्का पेलोड"
          toggle={prefs.dataSaving}
          onToggle={(v) => set({ dataSaving: v })}
        />
        <SettingRow
          icon="download"
          label="केवल वाई-फ़ाई पर ऑटो-डाउनलोड"
          toggle={prefs.wifiOnlyDownload}
          onToggle={(v) => set({ wifiOnlyDownload: v })}
        />

        <SectionLabel>पठनीयता</SectionLabel>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--jd-line-2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span className="jd-ui" style={{ fontSize: 14, fontWeight: 600, color: "var(--jd-ink)" }}>
              टेक्स्ट आकार
            </span>
            <span className="jd-ui" style={{ fontSize: 12, fontWeight: 800, color: "var(--jd-red)" }}>
              {SCALE_LABEL[prefs.fontScale]}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={SCALES.length - 1}
            step={1}
            value={scaleIndex}
            aria-label="टेक्स्ट आकार"
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
          label="उच्च कंट्रास्ट"
          toggle={prefs.highContrast}
          onToggle={(v) => set({ highContrast: v })}
        />
        <SettingRow
          icon="sun"
          label="डार्क मोड"
          sub="सिस्टम अनुसार"
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
                ? "सिस्टम"
                : prefs.themeMode === "dark"
                  ? "डार्क"
                  : "लाइट"}
            </button>
          }
        />
        <SettingRow
          icon="globe"
          label="स्क्रीन-रीडर अनुकूलन"
          sub="ARIA लेबल व फ़ोकस-क्रम"
          toggle={prefs.screenReaderOptimized}
          onToggle={(v) => set({ screenReaderOptimized: v })}
        />
      </main>
    </ReaderShell>
  );
}
