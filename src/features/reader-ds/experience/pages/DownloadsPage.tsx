"use client";

import { useEffect, useState } from "react";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { JdIcon } from "../../components/icons";
import { useJdDsT } from "../../i18n";
import {
  estimateTrackBytes,
  formatBytes,
  loadExperiencePrefs,
  saveExperiencePrefs,
} from "../prefs";
import type { BriefingTrack } from "../audio/types";
import { useReaderAudio } from "../audio/AudioProvider";

function DownloadsBody({ tracks }: { tracks: BriefingTrack[] }) {
  const { t } = useJdDsT();
  const audio = useReaderAudio();
  const [prefs, setPrefs] = useState(loadExperiencePrefs());

  const { setTracks, tracks: audioTracks } = audio;

  useEffect(() => {
    if (tracks.length && audioTracks.length === 0) setTracks(tracks);
  }, [tracks, audioTracks.length, setTracks]);

  useEffect(() => {
    setPrefs(loadExperiencePrefs());
  }, []);

  const downloaded = tracks.filter((track) => prefs.downloadedIds.includes(track.id));
  const used = downloaded.reduce((n, track) => n + estimateTrackBytes(track.durationSec), 0);
  const budget = prefs.downloadBudgetBytes;
  const pct = Math.min(100, Math.round((used / budget) * 100));

  const markAll = () => {
    const ids = tracks.slice(0, 3).map((track) => track.id);
    const bytes = tracks
      .slice(0, 3)
      .reduce((n, track) => n + estimateTrackBytes(track.durationSec), 0);
    setPrefs(saveExperiencePrefs({ downloadedIds: ids, downloadsBytes: bytes }));
  };

  const clearAll = () => {
    setPrefs(saveExperiencePrefs({ downloadedIds: [], downloadsBytes: 0 }));
  };

  const items = downloaded.length > 0 ? downloaded : tracks.slice(0, 0);

  return (
    <>
      <Masthead back backHref="/listen" pageTitle={t("listen.downloads")} />
      <div
        style={{
          flexShrink: 0,
          padding: "12px 16px",
          background: "var(--jd-paper-2)",
          borderBottom: "1px solid var(--jd-line)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span className="jd-ui" style={{ fontSize: 12, fontWeight: 700, color: "var(--jd-ink-2)" }}>
            {t("listen.storage", { used: formatBytes(used), budget: formatBytes(budget) })}
          </span>
          <button
            type="button"
            className="jd-ui"
            onClick={clearAll}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--jd-red)",
              background: "none",
              border: "none",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            {t("listen.clearAll")}
          </button>
        </div>
        <div style={{ height: 5, borderRadius: 5, background: "var(--jd-line)" }}>
          <div
            style={{
              width: `${pct}%`,
              height: 5,
              borderRadius: 5,
              background: "var(--jd-green)",
            }}
          />
        </div>
      </div>
      <main id="main-content" role="main" style={{ flex: 1, overflow: "auto", padding: "6px 16px" }}>
        {items.length === 0 ? (
          <div style={{ padding: "20px 0" }}>
            <p className="jd-ui" style={{ color: "var(--jd-muted)", fontSize: 13, marginBottom: 14 }}>
              {t("listen.noOffline")}
            </p>
            <button
              type="button"
              className="jd-ui"
              onClick={markAll}
              disabled={!tracks.length}
              style={{
                background: "var(--jd-navy)",
                color: "#fff",
                fontWeight: 800,
                fontSize: 13,
                padding: "12px 16px",
                borderRadius: 3,
                border: "none",
                cursor: "pointer",
              }}
            >
              {t("listen.markBriefing")}
            </button>
          </div>
        ) : (
          items.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "13px 0",
                borderBottom: "1px solid var(--jd-line-2)",
              }}
            >
              <button
                type="button"
                aria-label={t("listen.play")}
                onClick={() => {
                  const i = audio.tracks.findIndex((track) => track.id === a.id);
                  if (i >= 0) audio.playAt(i);
                }}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 2,
                  background: "var(--jd-navy)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <JdIcon name="play" size={18} stroke={1.9} color="var(--jd-gold-soft)" />
              </button>
              <div style={{ flex: 1 }}>
                <div className="jd-serif" style={{ fontSize: 14.5, fontWeight: 600, color: "var(--jd-ink)", lineHeight: 1.3 }}>
                  {a.headline}
                </div>
                <div className="jd-ui" style={{ fontSize: 10.5, color: "var(--jd-muted)", marginTop: 2 }}>
                  {a.durationLabel} · {formatBytes(estimateTrackBytes(a.durationSec))}
                </div>
              </div>
              <div
                className="jd-ui"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: "var(--jd-green)",
                }}
              >
                <JdIcon name="check" size={15} stroke={2.2} color="var(--jd-green)" />
                {t("listen.ready")}
              </div>
            </div>
          ))
        )}
      </main>
    </>
  );
}

/** C25 — offline / downloaded audio. */
export function DownloadsPage({ tracks }: { tracks: BriefingTrack[] }) {
  return (
    <ReaderShell activeNav="listen" audioTracks={tracks}>
      <DownloadsBody tracks={tracks} />
    </ReaderShell>
  );
}
