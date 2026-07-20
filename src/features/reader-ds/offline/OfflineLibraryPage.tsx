"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { AccountShell } from "../experience/components/AccountShell";
import { JdIcon } from "../components/icons";
import { useJdDsT } from "../i18n";
import { removeDownload } from "./download-manager";
import { useOfflineLibrary } from "./hooks";
import { formatBytes } from "./storage-manager";
import type { OfflineSort } from "./types";

/** Offline downloads library — only articles actually stored on device. */
export function OfflineLibraryPage({ initialQuery = "" }: { initialQuery?: string }) {
  const { t, locale } = useJdDsT();
  const [sort, setSort] = useState<OfflineSort>("newest");
  const [query, setQuery] = useState(initialQuery);
  const { rows, loading, reload } = useOfflineLibrary(sort, query);

  const sortOptions: Array<{ id: OfflineSort; label: string }> = useMemo(
    () => [
      { id: "newest", label: t("offline.sortNewest") },
      { id: "oldest", label: t("offline.sortOldest") },
      { id: "district", label: t("offline.sortDistrict") },
      { id: "category", label: t("offline.sortCategory") },
    ],
    [t]
  );

  return (
    <AccountShell pageTitle={t("offline.library")} active="offline" backHref="/archive">
      <div data-testid="jd-offline-library" style={{ padding: "12px 14px 28px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("offline.searchPlaceholder")}
            aria-label={t("offline.searchPlaceholder")}
            className="jd-ui"
            style={{
              flex: "1 1 180px",
              minHeight: 40,
              border: "1px solid var(--jd-line)",
              borderRadius: 3,
              padding: "0 10px",
              fontSize: 14,
            }}
          />
          <Link href="/archive/offline/storage" className="jd-ui" style={chipLink}>
            <JdIcon name="cog" size={15} stroke={1.8} color="currentColor" />
            {t("offline.storage")}
          </Link>
        </div>

        {query.trim() ? (
          <p className="jd-ui" role="status" style={{ fontSize: 12, fontWeight: 800, color: "var(--jd-amber)", margin: "0 0 10px" }}>
            {t("offline.offlineResults")}
          </p>
        ) : null}

        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14 }} role="group" aria-label={t("offline.sortLabel")}>
          {sortOptions.map((o) => (
            <button
              key={o.id}
              type="button"
              className="jd-ui"
              onClick={() => setSort(o.id)}
              aria-pressed={sort === o.id}
              style={{
                flexShrink: 0,
                minHeight: 36,
                padding: "0 10px",
                borderRadius: 2,
                border: `1px solid ${sort === o.id ? "var(--jd-navy)" : "var(--jd-line)"}`,
                background: sort === o.id ? "var(--jd-navy)" : "#fff",
                color: sort === o.id ? "#fff" : "var(--jd-navy)",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="jd-ui" style={{ color: "var(--jd-muted)" }}>
            {t("offline.loading")}
          </p>
        ) : rows.length === 0 ? (
          <div style={{ padding: "28px 8px", textAlign: "center" }}>
            <p className="jd-serif" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              {t("offline.emptyTitle")}
            </p>
            <p className="jd-ui" style={{ fontSize: 13, color: "var(--jd-ink-3)", marginTop: 8 }}>
              {t("offline.emptyBody")}
            </p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {rows.map((r) => (
              <li
                key={r.slug}
                style={{
                  borderTop: "1px solid var(--jd-line)",
                  padding: "12px 0",
                }}
              >
                <Link
                  href={`/archive/offline/read/${r.slug}`}
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  <div className="jd-ui" style={{ fontSize: 11, fontWeight: 800, color: "var(--jd-red)" }}>
                    {r.category || r.kicker}
                    {r.district ? ` · ${r.district}` : ""}
                    {r.favorite ? ` · ${t("offline.favorite")}` : ""}
                  </div>
                  <h2 className="jd-serif" style={{ margin: "4px 0 6px", fontSize: 17, lineHeight: 1.35, fontWeight: 700 }}>
                    {r.headline}
                  </h2>
                </Link>
                <div className="jd-ui" style={{ fontSize: 11.5, color: "var(--jd-muted)", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <span>
                    {t("offline.downloadedAt")}:{" "}
                    {new Date(r.downloadedAt).toLocaleString(locale === "en" ? "en-IN" : "hi-IN")}
                  </span>
                  <span>
                    {t("offline.size")}: {formatBytes(r.bytes, locale)}
                  </span>
                  <span>
                    {t("offline.language")}: {r.language === "en" ? "EN" : "हि"}
                  </span>
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <Link href={`/archive/offline/read/${r.slug}`} className="jd-ui" style={chipLink}>
                    {t("offline.openOffline")}
                  </Link>
                  <button
                    type="button"
                    className="jd-ui"
                    style={{ ...chipLink, border: "1px solid var(--jd-red)", color: "var(--jd-red)", cursor: "pointer", background: "#fff" }}
                    onClick={() => {
                      void removeDownload(r.slug).then(() => reload());
                    }}
                  >
                    {t("offline.remove")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AccountShell>
  );
}

const chipLink: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  minHeight: 36,
  padding: "0 10px",
  borderRadius: 2,
  border: "1px solid var(--jd-line)",
  color: "var(--jd-navy)",
  fontWeight: 700,
  fontSize: 12,
  textDecoration: "none",
};
