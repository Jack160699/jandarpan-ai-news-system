"use client";

import Link from "next/link";
import { useState } from "react";
import { AccountShell } from "../experience/components/AccountShell";
import { useJdDsT } from "../i18n";
import { removeDownload } from "./download-manager";
import { useOfflineStorageStats } from "./hooks";
import {
  clearOfflineImageCacheOnly,
  deleteAllDownloads,
  enforceStorageBudget,
  formatBytes,
  removeOldDownloads,
} from "./storage-manager";
import { DEFAULT_MAX_ARTICLES } from "./types";

/** Storage management — totals, largest, cleanup, clear. */
export function OfflineStoragePage() {
  const { t, locale } = useJdDsT();
  const { stats, reload } = useOfflineStorageStats();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>, doneMsg?: string) {
    setBusy(true);
    setNote(null);
    try {
      await action();
      await reload();
      if (doneMsg) setNote(doneMsg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountShell pageTitle={t("offline.storageTitle")} active="offline" backHref="/archive/offline">
      <div data-testid="jd-offline-storage" style={{ padding: "14px 16px 32px" }}>
        <dl
          style={{
            margin: 0,
            display: "grid",
            gap: 10,
            border: "1px solid var(--jd-line)",
            borderRadius: 3,
            padding: 14,
            background: "var(--jd-paper-2)",
          }}
        >
          <Stat
            label={t("offline.totalStorage")}
            value={stats ? formatBytes(stats.totalBytes, locale) : "—"}
          />
          <Stat
            label={t("offline.articleCount")}
            value={stats ? String(stats.articleCount) : "—"}
          />
          <Stat
            label={t("offline.imagesUsed")}
            value={stats ? formatBytes(stats.imagesBytesEstimate, locale) : "—"}
          />
        </dl>

        <p className="jd-ui" style={{ fontSize: 12, color: "var(--jd-ink-3)", margin: "12px 0 18px" }}>
          {t("offline.limitNote", {
            limit: stats ? formatBytes(stats.limitBytes, locale) : "—",
            max: DEFAULT_MAX_ARTICLES,
          })}
        </p>

        <h2 className="jd-ui" style={{ fontSize: 12, fontWeight: 800, color: "var(--jd-navy)", margin: "0 0 8px" }}>
          {t("offline.largest")}
        </h2>
        <ul style={{ listStyle: "none", margin: "0 0 18px", padding: 0 }}>
          {(stats?.largest ?? []).map((r) => (
            <li
              key={r.slug}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                borderTop: "1px solid var(--jd-line)",
                padding: "10px 0",
              }}
            >
              <Link
                href={`/archive/offline/read/${r.slug}`}
                className="jd-serif"
                style={{ flex: 1, color: "inherit", textDecoration: "none", fontSize: 15, fontWeight: 700 }}
              >
                {r.headline}
              </Link>
              <span className="jd-ui" style={{ fontSize: 11, color: "var(--jd-muted)", flexShrink: 0 }}>
                {formatBytes(r.bytes, locale)}
              </span>
              <button
                type="button"
                className="jd-ui"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await removeDownload(r.slug);
                  })
                }
                style={dangerBtn}
              >
                {t("offline.remove")}
              </button>
            </li>
          ))}
          {!stats?.largest.length ? (
            <li className="jd-ui" style={{ fontSize: 13, color: "var(--jd-muted)", padding: "8px 0" }}>
              {t("offline.emptyTitle")}
            </li>
          ) : null}
        </ul>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            className="jd-ui"
            disabled={busy}
            style={actionBtn}
            onClick={() =>
              void run(async () => {
                const n = await removeOldDownloads(30);
                setNote(t("offline.cleanupDone", { n }));
              })
            }
          >
            {t("offline.removeOld")}
          </button>
          <button
            type="button"
            className="jd-ui"
            disabled={busy}
            style={actionBtn}
            onClick={() =>
              void run(async () => {
                const { removed } = await enforceStorageBudget();
                setNote(t("offline.cleanupDone", { n: removed.length }));
              })
            }
          >
            {t("offline.enforceBudget")}
          </button>
          <button
            type="button"
            className="jd-ui"
            disabled={busy}
            style={actionBtn}
            onClick={() => void run(() => clearOfflineImageCacheOnly())}
          >
            {t("offline.clearCache")}
          </button>
          <button
            type="button"
            className="jd-ui"
            disabled={busy}
            style={{ ...actionBtn, color: "var(--jd-red)", borderColor: "var(--jd-red)" }}
            onClick={() => {
              if (!window.confirm(t("offline.deleteAllConfirm"))) return;
              void run(async () => {
                const n = await deleteAllDownloads();
                setNote(t("offline.cleanupDone", { n }));
              });
            }}
          >
            {t("offline.deleteAll")}
          </button>
        </div>

        {note ? (
          <p role="status" aria-live="polite" className="jd-ui" style={{ marginTop: 14, fontSize: 12.5 }}>
            {note}
          </p>
        ) : null}
      </div>
    </AccountShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <dt className="jd-ui" style={{ fontSize: 12.5, color: "var(--jd-ink-3)", margin: 0 }}>
        {label}
      </dt>
      <dd className="jd-ui" style={{ fontSize: 13, fontWeight: 800, margin: 0, color: "var(--jd-navy)" }}>
        {value}
      </dd>
    </div>
  );
}

const actionBtn = {
  minHeight: 44,
  border: "1px solid var(--jd-line)",
  borderRadius: 3,
  background: "#fff",
  color: "var(--jd-navy)",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
} as const;

const dangerBtn = {
  ...actionBtn,
  minHeight: 36,
  padding: "0 8px",
  fontSize: 11.5,
  color: "var(--jd-red)",
  borderColor: "var(--jd-red)",
} as const;
