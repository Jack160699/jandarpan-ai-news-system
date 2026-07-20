"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import type { CgDistrict } from "@/lib/regional/districts";
import { useJdDsT } from "../i18n";
import { JdIcon } from "./icons";

type DistrictSelectorProps = {
  districts: Array<Pick<CgDistrict, "slug" | "name" | "nameHi">>;
  selectedSlug?: string | null;
};

/** A10 district selector — search + list; selection updates cookie and opens district home. */
export function DistrictSelector({ districts, selectedSlug }: DistrictSelectorProps) {
  const { t, locale } = useJdDsT();
  const { prefs, setHomeDistrict } = useReaderPreferences();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [, startTransition] = useTransition();
  const current = selectedSlug ?? prefs.homeDistrict ?? "raipur";

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return districts;
    return districts.filter(
      (d) =>
        d.name.toLowerCase().includes(needle) ||
        d.nameHi.includes(q.trim()) ||
        d.slug.includes(needle)
    );
  }, [districts, q]);

  const select = (slug: string) => {
    setHomeDistrict(slug);
    startTransition(() => {
      router.push(`/district/${slug}`);
      router.refresh();
    });
  };

  return (
    <>
      <div
        style={{
          flexShrink: 0,
          padding: "12px 14px 8px",
          background: "#fff",
          borderBottom: "1px solid var(--jd-line)",
        }}
        data-jd-locale={locale}
      >
        <label
          style={{
            background: "var(--jd-paper-2)",
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
          }}
        >
          <JdIcon name="search" size={18} stroke={1.9} color="var(--jd-muted)" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("district.searchPlaceholder")}
            aria-label={t("district.searchPlaceholder")}
            className="jd-ui"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: locale === "en" ? 12.5 : 13.5,
              background: "transparent",
              color: "var(--jd-ink)",
              fontFamily: "inherit",
            }}
          />
        </label>
        <button
          type="button"
          className="jd-ui"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginTop: 10,
            fontSize: locale === "en" ? 12 : 13,
            fontWeight: 700,
            color: "var(--jd-red)",
            background: "none",
            border: "none",
            padding: "8px 0",
            cursor: "pointer",
            minHeight: 44,
            textAlign: "left",
            maxWidth: "100%",
          }}
          onClick={() => {
            /* Geolocation is best-effort; fall back to current selection home. */
            if (typeof navigator !== "undefined" && navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                () => select(current),
                () => select(current),
                { timeout: 4000 }
              );
            } else {
              select(current);
            }
          }}
        >
          <JdIcon name="pin" size={17} stroke={1.9} color="var(--jd-red)" />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {t("district.nearMe")}
          </span>
        </button>
      </div>

      <div style={{ padding: "4px 0" }}>
        {filtered.length === 0 ? (
          <p className="jd-ui" style={{ padding: 16, color: "var(--jd-muted)", fontSize: 14 }}>
            {t("district.empty")}
          </p>
        ) : (
          filtered.map((d) => {
            const on = d.slug === current;
            const label = locale === "en" ? d.name : d.nameHi;
            return (
              <button
                key={d.slug}
                type="button"
                onClick={() => select(d.slug)}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "13px 16px",
                  border: "none",
                  borderBottom: "1px solid var(--jd-line-2)",
                  background: on ? "#fbf3e6" : "transparent",
                  minHeight: 44,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <JdIcon name="pin" size={17} stroke={1.8} color={on ? "var(--jd-red)" : "var(--jd-muted)"} />
                  <span
                    className="jd-serif"
                    style={{
                      fontSize: 15.5,
                      fontWeight: on ? 700 : 500,
                      color: "var(--jd-ink)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </span>
                </span>
                {on ? <JdIcon name="check" size={20} stroke={2.2} color="var(--jd-red)" /> : null}
              </button>
            );
          })
        )}
      </div>
    </>
  );
}
