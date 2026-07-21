"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReaderShell } from "../../components/ReaderShell";
import { JdIcon } from "../../components/icons";
import { useJdDsT } from "../../i18n";
import { READER_LANGUAGE_OPTIONS, type ReaderLanguage } from "@/lib/i18n/reader-languages";
import { useLanguage } from "@/providers/LanguageProvider";
import { savePreferences } from "@/lib/reader-preferences";

const COMING_SOON: Array<{ id: string; native: string; label: string }> = [
  { id: "or", native: "ଓଡ଼ିଆ", label: "Odia" },
];

function toReaderLang(value: string | null | undefined): ReaderLanguage {
  return value === "en" ? "en" : "hi";
}

/** D26 — language selection. Persists via LanguageProvider + reader prefs. */
export function LanguagePage({ continueHref = "/archive" }: { continueHref?: string }) {
  const router = useRouter();
  const { confirmLanguage, language } = useLanguage();
  const { t } = useJdDsT();
  const providerLang = toReaderLang(language);
  const [override, setOverride] = useState<ReaderLanguage | null>(null);
  const selected = override ?? providerLang;

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
          {t("brand.name")}
        </div>
        <div className="jd-ui" style={{ fontSize: 13, color: "#8ea0c4" }}>
          {t("language.chooseTitle")} · {t("language.chooseSub")}
        </div>
      </div>
      <main id="main-content" role="main" style={{ flex: 1, overflow: "auto", padding: "18px 16px" }}>
        {READER_LANGUAGE_OPTIONS.map((l) => {
          const on = selected === l.id;
          return (
            <button
              key={l.id}
              type="button"
              data-testid={`lang-option-${l.id}`}
              onClick={() => setOverride(l.id as ReaderLanguage)}
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
              <div className="jd-serif" style={{ fontSize: 19, fontWeight: 700 }}>
                {l.native}
              </div>
              <div className="jd-ui" style={{ fontSize: 11.5, color: "var(--jd-muted)" }}>
                {l.label} · {t("language.comingSoon")}
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          data-testid="lang-continue"
          className="jd-ui"
          onClick={() => {
            confirmLanguage(selected);
            savePreferences({ language: selected, languageChosen: true });
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
          {t("language.continue")}
        </button>
      </main>
    </ReaderShell>
  );
}
