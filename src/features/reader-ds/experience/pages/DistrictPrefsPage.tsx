"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { JdIcon } from "../../components/icons";
import { Toggle } from "../components/Toggle";
import { SectionLabel } from "../components/SettingRow";
import { useJdDsT } from "../../i18n";
import { CG_DISTRICTS } from "@/lib/regional/districts";
import { loadPreferences, savePreferences } from "@/lib/reader-preferences";
import {
  loadHomepageLayout,
  saveHomepageLayout,
} from "@/lib/personalization/homepage-layout";
import { syncDistrictCookie } from "@/lib/personalization/cookies";

/** D34 — primary + followed districts. */
export function DistrictPrefsPage() {
  const { t, locale } = useJdDsT();
  const [primary, setPrimary] = useState("raipur");
  const [others, setOthers] = useState<string[]>([]);
  const [autoLocate, setAutoLocate] = useState(false);

  useEffect(() => {
    const prefs = loadPreferences();
    const layout = loadHomepageLayout();
    setPrimary(prefs.homeDistrict || "raipur");
    setOthers((layout.followedDistricts ?? []).filter((s) => s !== prefs.homeDistrict));
  }, []);

  const districtName = (d: (typeof CG_DISTRICTS)[number]) =>
    locale === "en" ? d.name : d.nameHi;

  const primaryDistrict = CG_DISTRICTS.find((d) => d.slug === primary);
  const otherDistricts = others
    .map((slug) => CG_DISTRICTS.find((d) => d.slug === slug))
    .filter(Boolean) as typeof CG_DISTRICTS;

  const setPrimaryDistrict = (slug: string) => {
    setPrimary(slug);
    savePreferences({ homeDistrict: slug });
    syncDistrictCookie(slug);
    const layout = loadHomepageLayout();
    const followed = [slug, ...(layout.followedDistricts ?? []).filter((s) => s !== slug)];
    saveHomepageLayout({ ...layout, followedDistricts: followed });
    setOthers(followed.filter((s) => s !== slug));
  };

  const removeOther = (slug: string) => {
    const next = others.filter((s) => s !== slug);
    setOthers(next);
    const layout = loadHomepageLayout();
    saveHomepageLayout({
      ...layout,
      followedDistricts: [primary, ...next].filter(Boolean),
    });
  };

  return (
    <ReaderShell activeNav="more">
      <Masthead back backHref="/archive" pageTitle={t("districtPrefs.shortTitle")} />
      <div
        style={{
          flexShrink: 0,
          padding: "12px 16px",
          background: "var(--jd-paper-2)",
          borderBottom: "1px solid var(--jd-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <JdIcon name="pin" size={18} stroke={1.8} color="var(--jd-red)" />
          <span className="jd-ui" style={{ fontSize: 13, fontWeight: 700, color: "var(--jd-ink-2)" }}>
            {t("districtPrefs.autoLocate")}
          </span>
        </div>
        <Toggle
          on={autoLocate}
          label={t("districtPrefs.autoLocateAria")}
          onChange={(v) => {
            setAutoLocate(v);
            if (v && typeof navigator !== "undefined" && navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                () => {
                  /* Keep primary unless a geo resolver exists — no fake district invent. */
                },
                () => setAutoLocate(false),
                { maximumAge: 60000, timeout: 8000 }
              );
            }
          }}
        />
      </div>
      <main id="main-content" role="main" style={{ flex: 1, overflow: "auto", padding: "6px 0" }}>
        <SectionLabel>{t("districtPrefs.primarySection")}</SectionLabel>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderBottom: "1px solid var(--jd-line-2)",
            background: "#fbf3e6",
          }}
        >
          <JdIcon name="pin" size={20} stroke={1.9} color="var(--jd-red)" />
          <span className="jd-serif" style={{ flex: 1, fontSize: 15.5, fontWeight: 700 }}>
            {primaryDistrict ? districtName(primaryDistrict) : primary}
          </span>
          <span className="jd-ui" style={{ fontSize: 10.5, fontWeight: 800, color: "var(--jd-red)" }}>
            {t("districtPrefs.primaryBadge")}
          </span>
        </div>

        <SectionLabel>{t("districtPrefs.otherSection")}</SectionLabel>
        {otherDistricts.map((d) => (
          <div
            key={d.slug}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              borderBottom: "1px solid var(--jd-line-2)",
            }}
          >
            <JdIcon name="list" size={18} stroke={1.7} color="var(--jd-muted)" />
            <span className="jd-serif" style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>
              {districtName(d)}
            </span>
            <button
              type="button"
              aria-label={t("districtPrefs.removeAria")}
              onClick={() => removeOther(d.slug)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}
            >
              <JdIcon name="close" size={16} stroke={1.9} color="var(--jd-muted)" />
            </button>
          </div>
        ))}

        <Link
          href="/district?select=1"
          className="jd-ui"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 16px",
            fontSize: 13.5,
            fontWeight: 700,
            color: "var(--jd-red)",
            textDecoration: "none",
          }}
        >
          <JdIcon name="plus" size={18} stroke={2} color="var(--jd-red)" />
          {t("districtPrefs.addChange")}
        </Link>

        <SectionLabel>{t("districtPrefs.quickPick")}</SectionLabel>
        <div style={{ padding: "0 16px 20px", display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CG_DISTRICTS.filter((d) => d.priority === 1)
            .slice(0, 6)
            .map((d) => (
              <button
                key={d.slug}
                type="button"
                onClick={() => setPrimaryDistrict(d.slug)}
                className="jd-ui"
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  padding: "8px 12px",
                  borderRadius: 2,
                  border: `1px solid ${primary === d.slug ? "var(--jd-red)" : "var(--jd-line)"}`,
                  background: primary === d.slug ? "#fbf3e6" : "#fff",
                  color: "var(--jd-ink)",
                  cursor: "pointer",
                }}
              >
                {districtName(d)}
              </button>
            ))}
        </div>
      </main>
    </ReaderShell>
  );
}
