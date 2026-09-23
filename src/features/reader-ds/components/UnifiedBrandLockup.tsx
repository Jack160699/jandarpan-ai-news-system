"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { CG_DISTRICTS, getDistrict } from "@/lib/regional/districts";
import { useJdDsT } from "../i18n";
import { BrandMark } from "./BrandMark";
import { JdIcon } from "./icons";
import {
  isManualDistrictLocked,
  readGeoDerivedDistrict,
  requestDistrictFromBrowserLocation,
  writeDistrictSource,
} from "@/lib/district-intelligence";

type UnifiedBrandLockupProps = {
  /** "dark" for navy mobile masthead, "light" for desktop cream masthead */
  tone?: "dark" | "light";
  /** Optional size variant */
  size?: "compact" | "regular";
  /** Premium badge (e.g. for subscribed member) */
  premiumBadge?: boolean;
};

/**
 * Approved Jan Darpan unified newspaper brand lockup (Requirements #10, #11, #12, #13):
 *
 *     [BrandMark]  जन दर्पण     दुर्ग ▾
 *     ────────────────────────────────
 *                 छत्तीसगढ़
 *
 * - Primary logo: जन दर्पण
 * - Directly beside it: district selector dropdown button
 * - Full-width divider rule spanning the combined logo + district lockup
 * - Small supporting state foundation: छत्तीसगढ़ centered underneath
 */
export function UnifiedBrandLockup({
  tone = "dark",
  size = "compact",
  premiumBadge = false,
}: UnifiedBrandLockupProps) {
  const { t, locale } = useJdDsT();
  const { prefs, setHomeDistrict } = useReaderPreferences();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locating, setLocating] = useState(false);

  const currentDistrictSlug = prefs.homeDistrict?.trim() || "raipur";
  const currentDistrict = getDistrict(currentDistrictSlug);

  const districtLabel = currentDistrict
    ? locale === "en"
      ? currentDistrict.name
      : currentDistrict.nameHi
    : locale === "en"
      ? "Raipur"
      : "रायपुर";

  // Auto-detect district on first load if not locked by manual selection
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isManualDistrictLocked()) return;

    const storedGeo = readGeoDerivedDistrict();
    if (storedGeo && storedGeo !== prefs.homeDistrict) {
      setHomeDistrict(storedGeo);
      return;
    }

    if (navigator?.geolocation && !storedGeo) {
      // Opportunistic silent check if permission was already granted
      if ("permissions" in navigator) {
        navigator.permissions
          .query({ name: "geolocation" as PermissionName })
          .then((status) => {
            if (status.state === "granted") {
              void requestDistrictFromBrowserLocation().then((res) => {
                if (res.ok) {
                  writeDistrictSource("geo");
                  setHomeDistrict(res.slug);
                }
              });
            }
          })
          .catch(() => {});
      }
    }
  }, [prefs.homeDistrict, setHomeDistrict]);

  const handleSelectDistrict = useCallback(
    (slug: string) => {
      setHomeDistrict(slug);
      writeDistrictSource("explicit");
      setPickerOpen(false);
    },
    [setHomeDistrict]
  );

  const handleUseLocation = useCallback(() => {
    setLocating(true);
    requestDistrictFromBrowserLocation()
      .then((res) => {
        setLocating(false);
        if (res.ok) {
          writeDistrictSource("geo");
          setHomeDistrict(res.slug);
          setPickerOpen(false);
        }
      })
      .catch(() => {
        setLocating(false);
      });
  }, [setHomeDistrict]);

  const filteredDistricts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return CG_DISTRICTS;
    return CG_DISTRICTS.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.nameHi.includes(searchQuery.trim()) ||
        d.slug.includes(q)
    );
  }, [searchQuery]);

  const isDark = tone === "dark";
  const isRegular = size === "regular";

  return (
    <>
      <div
        className="jd-unified-brand-lockup"
        data-testid="jd-unified-brand-lockup"
        data-tone={tone}
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "stretch",
          position: "relative",
          minWidth: 0,
          flexShrink: 1,
        }}
      >
        {/* Top row: [BrandMark] जन दर्पण  +  [दुर्ग ▾] */}
        <div
          className="jd-unified-brand-lockup__row"
          style={{
            display: "flex",
            alignItems: "center",
            gap: isRegular ? 8 : 6,
            minWidth: 0,
          }}
        >
          <Link
            href="/"
            className="jd-unified-brand-lockup__logo-link"
            aria-label={t("masthead.homeAria")}
            data-testid="jd-masthead-brand"
            style={{
              display: "flex",
              alignItems: "center",
              gap: isRegular ? 7 : 5,
              textDecoration: "none",
              color: isDark ? "#FBF8F2" : "var(--jd-navy)",
              minWidth: 0,
            }}
          >
            <BrandMark size={isRegular ? 32 : 22} radius={isRegular ? 6 : 4} />
            <span
              className="jd-brand jd-unified-brand-lockup__title"
              style={{
                fontFamily: "var(--jd-ff-brand)",
                fontWeight: 700,
                fontSize: isRegular
                  ? "clamp(1.35rem, 3.2vw, 1.65rem)"
                  : "clamp(1.05rem, 3.8vw, 1.25rem)",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                letterSpacing: "-0.01em",
                color: isDark ? "#FBF8F2" : "var(--jd-navy)",
              }}
            >
              {t("brand.name")}
            </span>
          </Link>

          {/* District selector directly beside brand logo */}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="jd-unified-brand-lockup__district-btn"
            data-testid="district-selector-trigger"
            data-brand-district-trigger="true"
            aria-label={`जिला चुनें, वर्तमान: ${districtLabel}`}
            aria-haspopup="dialog"
            aria-expanded={pickerOpen}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              background: isDark
                ? "rgba(201, 162, 75, 0.14)"
                : "rgba(14, 27, 61, 0.06)",
              border: isDark
                ? "1px solid rgba(201, 162, 75, 0.35)"
                : "1px solid rgba(14, 27, 61, 0.16)",
              borderRadius: 3,
              padding: isRegular ? "3px 8px" : "2px 6px",
              color: isDark ? "var(--jd-gold-soft)" : "var(--jd-navy)",
              fontFamily: "var(--jd-ff-ui)",
              fontSize: isRegular ? 13 : 11.5,
              fontWeight: 750,
              cursor: "pointer",
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "background 0.15s ease, border-color 0.15s ease",
            }}
          >
            <span>{districtLabel}</span>
            <JdIcon
              name="chevD"
              size={isRegular ? 11 : 9.5}
              stroke={2.4}
              color={isDark ? "var(--jd-gold-soft)" : "var(--jd-navy)"}
            />
          </button>

          {premiumBadge ? (
            <span
              className="jd-ui jd-type-caption"
              style={{
                fontWeight: 800,
                letterSpacing: ".06em",
                color: "var(--jd-navy)",
                background: "var(--jd-gold)",
                padding: "2px 5px",
                borderRadius: 2,
                fontSize: 10,
                flexShrink: 0,
              }}
            >
              {t("masthead.premium")}
            </span>
          ) : null}
        </div>

        {/* Foundation line across the full width of the combined logo + district lockup */}
        <div
          className="jd-unified-brand-lockup__rule"
          aria-hidden="true"
          style={{
            height: 1,
            marginTop: 3,
            marginBottom: 2,
            background: isDark
              ? "linear-gradient(90deg, rgba(201, 162, 75, 0.3) 0%, rgba(201, 162, 75, 0.75) 50%, rgba(201, 162, 75, 0.3) 100%)"
              : "linear-gradient(90deg, rgba(201, 162, 75, 0.4) 0%, rgba(201, 162, 75, 0.9) 50%, rgba(201, 162, 75, 0.4) 100%)",
            width: "100%",
          }}
        />

        {/* Small supporting state label centered underneath */}
        <div
          className="jd-unified-brand-lockup__state"
          style={{
            textAlign: "center",
            fontFamily: "var(--jd-ff-ui)",
            fontSize: isRegular ? 10.5 : 9,
            fontWeight: 800,
            letterSpacing: "0.22em",
            color: isDark ? "var(--jd-gold-soft)" : "var(--jd-navy-light, #3d4a66)",
            lineHeight: 1.2,
            textTransform: "uppercase",
            userSelect: "none",
          }}
        >
          छत्तीसगढ़
        </div>
      </div>

      {/* Accessible District Selection Dialog */}
      {pickerOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="छत्तीसगढ़ जिला चुनें"
          data-testid="jd-district-picker-dialog"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(5, 8, 15, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 14,
            boxSizing: "border-box",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPickerOpen(false);
          }}
        >
          <div
            style={{
              background: "var(--jd-paper, #FBF8F2)",
              color: "var(--jd-ink, #1C1917)",
              borderRadius: 6,
              maxWidth: 480,
              width: "100%",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
              overflow: "hidden",
              border: "1px solid var(--jd-line, #E7E0D3)",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px 10px",
                borderBottom: "1px solid var(--jd-line, #E7E0D3)",
                background: "var(--jd-paper-2, #F4EFE6)",
              }}
            >
              <div>
                <h3
                  className="jd-serif"
                  style={{
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 750,
                    color: "var(--jd-navy, #0E1B3D)",
                  }}
                >
                  अपना जिला चुनें
                </h3>
                <span
                  style={{
                    fontSize: 11.5,
                    color: "var(--jd-muted, #78716C)",
                    fontFamily: "var(--jd-ff-ui)",
                  }}
                >
                  स्थानीय समाचार और लाइव अपडेट के लिए
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                aria-label="बंद करें"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 6,
                  color: "var(--jd-navy, #0E1B3D)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <JdIcon name="close" size={20} stroke={2} />
              </button>
            </div>

            {/* Quick Actions & Search */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--jd-line)" }}>
              <button
                type="button"
                onClick={handleUseLocation}
                disabled={locating}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "9px 14px",
                  background: "var(--jd-red, #C8102E)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  marginBottom: 10,
                  fontFamily: "var(--jd-ff-ui)",
                }}
              >
                <JdIcon name="pin" size={15} stroke={2} color="#fff" />
                <span>
                  {locating
                    ? "स्थान पहचाना जा रहा है..."
                    : "निकटतम जिला पहचानें (स्थान का उपयोग करें)"}
                </span>
              </button>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#fff",
                  border: "1px solid var(--jd-line, #E7E0D3)",
                  borderRadius: 4,
                  padding: "6px 10px",
                }}
              >
                <JdIcon name="search" size={15} stroke={1.8} color="var(--jd-muted)" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="जिला खोजें... (उदा. दुर्ग, रायपुर, बिलासपुर)"
                  autoFocus
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 13,
                    width: "100%",
                    fontFamily: "var(--jd-ff-ui)",
                    color: "var(--jd-ink)",
                  }}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      padding: 2,
                    }}
                  >
                    <JdIcon name="close" size={14} stroke={2} />
                  </button>
                ) : null}
              </div>
            </div>

            {/* District Grid / List */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "10px 14px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(115px, 1fr))",
                gap: 7,
              }}
            >
              {filteredDistricts.map((d) => {
                const isSelected = d.slug === currentDistrictSlug;
                return (
                  <button
                    key={d.slug}
                    type="button"
                    onClick={() => handleSelectDistrict(d.slug)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 4,
                      border: isSelected
                        ? "1.5px solid var(--jd-red, #C8102E)"
                        : "1px solid var(--jd-line, #E7E0D3)",
                      background: isSelected
                        ? "rgba(200, 16, 46, 0.08)"
                        : "#fff",
                      color: isSelected
                        ? "var(--jd-red, #C8102E)"
                        : "var(--jd-ink, #1C1917)",
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: 13,
                      fontFamily: "var(--jd-ff-ui)",
                      cursor: "pointer",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1.3,
                      transition: "all 0.12s ease",
                    }}
                  >
                    <span>{d.nameHi}</span>
                    <span
                      style={{
                        fontSize: 10,
                        color: isSelected ? "var(--jd-red)" : "var(--jd-muted)",
                        fontWeight: 400,
                      }}
                    >
                      {d.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
