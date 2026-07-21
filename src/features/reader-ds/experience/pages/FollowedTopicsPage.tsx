"use client";

import { useEffect, useState } from "react";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { JdIcon } from "../../components/icons";
import { Toggle } from "../components/Toggle";
import { SectionLabel } from "../components/SettingRow";
import { useJdDsT } from "../../i18n";
import { loadPreferences, savePreferences } from "@/lib/reader-preferences";
import { syncInterestsCookie } from "@/lib/personalization/cookies";
import type { JdDsStringKey } from "../../i18n/strings";

/** D32 — followed topics from feed interests. */
export function FollowedTopicsPage() {
  const { t } = useJdDsT();
  const [interests, setInterests] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<Record<string, boolean>>({});

  const SUGGESTIONS: Array<{ id: string; labelKey: JdDsStringKey }> = [
    { id: "agriculture", labelKey: "followed.topicAgriculture" },
    { id: "education", labelKey: "followed.topicEducation" },
    { id: "health", labelKey: "followed.topicHealth" },
    { id: "bastar", labelKey: "followed.topicBastar" },
  ];

  const DEFAULT_TOPICS: Array<{ id: string; labelKey: JdDsStringKey; kindKey: JdDsStringKey }> = [
    { id: "politics", labelKey: "followed.topicPolitics", kindKey: "followed.topicPolitics" },
    { id: "business", labelKey: "followed.topicBusiness", kindKey: "followed.topicBusiness" },
    { id: "sports", labelKey: "followed.topicSports", kindKey: "followed.topicSports" },
    { id: "local", labelKey: "followed.topicLocal", kindKey: "followed.topicLocalKind" },
  ];

  useEffect(() => {
    const prefs = loadPreferences();
    setInterests(prefs.feedInterests ?? []);
    const a: Record<string, boolean> = {};
    for (const id of prefs.feedInterests ?? []) a[id] = true;
    setAlerts(a);
  }, []);

  const persist = (next: string[]) => {
    setInterests(next);
    savePreferences({ feedInterests: next });
    syncInterestsCookie(next);
  };

  const followed = DEFAULT_TOPICS.filter((topic) => interests.includes(topic.id));
  const suggestions = SUGGESTIONS.filter((s) => !interests.includes(s.id));

  return (
    <ReaderShell activeNav="more">
      <Masthead back backHref="/archive" pageTitle={t("followed.shortTitle")} />
      <main id="main-content" role="main" style={{ flex: 1, overflow: "auto", padding: "6px 0" }}>
        <SectionLabel>{t("followed.yourTopics")}</SectionLabel>
        {followed.length === 0 ? (
          <p className="jd-ui" style={{ padding: "8px 16px", color: "var(--jd-muted)", fontSize: 13 }}>
            {t("followed.emptyHint")}
          </p>
        ) : (
          followed.map((f) => {
            const label = t(f.labelKey);
            return (
              <div
                key={f.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--jd-line-2)",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 38,
                    background: "var(--jd-navy)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <JdIcon name="bolt" size={18} stroke={1.9} color="var(--jd-gold-soft)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="jd-serif" style={{ fontSize: 14.5, fontWeight: 700, color: "var(--jd-ink)" }}>
                    {label}
                  </div>
                  <div className="jd-ui" style={{ fontSize: 10.5, color: "var(--jd-muted)" }}>
                    {t(f.kindKey)}
                  </div>
                </div>
                <Toggle
                  on={alerts[f.id] !== false}
                  label={label}
                  onChange={(v) => setAlerts((a) => ({ ...a, [f.id]: v }))}
                />
                <button
                  type="button"
                  aria-label={t("followed.unfollowAria")}
                  onClick={() => persist(interests.filter((id) => id !== f.id))}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}
                >
                  <JdIcon name="close" size={16} stroke={1.9} color="var(--jd-muted)" />
                </button>
              </div>
            );
          })
        )}

        <SectionLabel>{t("followed.suggestions")}</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9, padding: "0 16px 20px" }}>
          {[
            ...DEFAULT_TOPICS.filter((topic) => !interests.includes(topic.id)).map((topic) => ({
              id: topic.id,
              label: `#${t(topic.labelKey)}`,
            })),
            ...suggestions.map((s) => ({ id: s.id, label: t(s.labelKey) })),
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => persist([...interests, s.id])}
              className="jd-ui"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12.5,
                fontWeight: 700,
                color: "var(--jd-navy)",
                border: "1px solid var(--jd-line)",
                borderRadius: 2,
                padding: "7px 12px",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <JdIcon name="plus" size={13} stroke={2} color="var(--jd-red)" />
              {s.label}
            </button>
          ))}
        </div>
      </main>
    </ReaderShell>
  );
}
