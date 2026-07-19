"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ReaderShell } from "../../components/ReaderShell";
import { JdIcon } from "../../components/icons";
import { LANGUAGE_OPTIONS, type NewsroomLanguage } from "@/lib/i18n/languages";
import { loadPreferences, savePreferences } from "@/lib/reader-preferences";
import { saveStoredLanguage } from "@/lib/i18n/storage";

const COMING_SOON: Array<{ id: string; native: string; label: string }> = [
  { id: "or", native: "ଓଡ଼ିଆ", label: "Odia" },
];

/** D26 — language selection. */
export function LanguagePage({ continueHref = "/archive" }: { continueHref?: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<NewsroomLanguage>("hi");

  useEffect(() => {
    setSelected(loadPreferences().language || "hi");
  }, []);

  const primary = LANGUAGE_OPTIONS.filter((l) => l.id === "hi" || l.id === "en" || l.id === "mr");

  return (
    <ReaderShell activeNav="more" hideBottomNav>
      <div
        style={{
          flexShrink: 0,
          background: "var(--jd-navy)",
          color: "var(--jd-paper)",
          padding: "28px 20px 22px",
          textAlign: "center",
        }}
      >
        <div className="jd-brand" style={{ fontSize: 34, marginBottom: 6 }}>
          जनदर्पण
        </div>
        <div className="jd-ui" style={{ fontSize: 13, color: "#8ea0c4" }}>
          अपनी भाषा चुनें · Choose your language
        </div>
      </div>
      <main id="main-content" role="main" style={{ flex: 1, overflow: "auto", padding: "18px 16px" }}>
        {primary.map((l) => {
          const on = selected === l.id;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => setSelected(l.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px",
                border: `1.5px solid ${on ? "var(--jd-red)" : "var(--jd-line)"}`,
                background: on ? "#fbf3e6" : "#fff",
                borderRadius: 3,
                marginBottom: 11,
                width: "100%",
                cursor: "pointer",
                minHeight: 44,
              }}
            >
              <div style={{ textAlign: "left" }}>
                <div className="jd-serif" style={{ fontSize: 19, fontWeight: 700, color: "var(--jd-ink)" }}>
                  {l.native}
                </div>
                <div className="jd-ui" style={{ fontSize: 11.5, color: "var(--jd-muted)" }}>
                  {l.label}
                </div>
              </div>
              {on ? <JdIcon name="check" size={22} stroke={2.2} color="var(--jd-red)" /> : null}
            </button>
          );
        })}
        {COMING_SOON.map((l) => (
          <div
            key={l.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px",
              border: "1.5px solid var(--jd-line)",
              background: "#fff",
              borderRadius: 3,
              marginBottom: 11,
              opacity: 0.5,
            }}
          >
            <div>
              <div className="jd-serif" style={{ fontSize: 19, fontWeight: 700 }}>{l.native}</div>
              <div className="jd-ui" style={{ fontSize: 11.5, color: "var(--jd-muted)" }}>
                {l.label} · जल्द
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="jd-ui"
          onClick={() => {
            savePreferences({ language: selected, languageChosen: true });
            saveStoredLanguage(selected, true);
            router.push(continueHref);
          }}
          style={{
            marginTop: 8,
            width: "100%",
            textAlign: "center",
            background: "var(--jd-red)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            padding: "14px 0",
            borderRadius: 3,
            border: "none",
            cursor: "pointer",
          }}
        >
          जारी रखें
        </button>
      </main>
    </ReaderShell>
  );
}
