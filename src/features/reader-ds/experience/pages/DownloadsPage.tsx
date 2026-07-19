"use client";

import { useEffect, useState } from "react";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { JdIcon } from "../../components/icons";
import {
  estimateTrackBytes,
  formatBytes,
  loadExperiencePrefs,
  saveExperiencePrefs,
} from "../prefs";
import type { BriefingTrack } from "../audio/types";
import { useReaderAudio } from "../audio/AudioProvider";

function DownloadsBody({ tracks }: { tracks: BriefingTrack[] }) {
  const audio = useReaderAudio();
  const [prefs, setPrefs] = useState(loadExperiencePrefs());

  const { setTracks, tracks: audioTracks } = audio;

  useEffect(() => {
    if (tracks.length && audioTracks.length === 0) setTracks(tracks);
  }, [tracks, audioTracks.length, setTracks]);

  useEffect(() => {
    setPrefs(loadExperiencePrefs());
  }, []);

  const downloaded = tracks.filter((t) => prefs.downloadedIds.includes(t.id));
  const used = downloaded.reduce((n, t) => n + estimateTrackBytes(t.durationSec), 0);
  const budget = prefs.downloadBudgetBytes;
  const pct = Math.min(100, Math.round((used / budget) * 100));

  const markAll = () => {
    const ids = tracks.slice(0, 3).map((t) => t.id);
    const bytes = tracks
      .slice(0, 3)
      .reduce((n, t) => n + estimateTrackBytes(t.durationSec), 0);
    setPrefs(saveExperiencePrefs({ downloadedIds: ids, downloadsBytes: bytes }));
  };

  const clearAll = () => {
    setPrefs(saveExperiencePrefs({ downloadedIds: [], downloadsBytes: 0 }));
  };

  const items =
    downloaded.length > 0
      ? downloaded
      : tracks.slice(0, 0);

  return (
    <>
      <Masthead back backHref="/listen" pageTitle="डाउनलोड" />
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
            संग्रहण · {formatBytes(used)} / {formatBytes(budget)}
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
            सभी हटाएँ
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
              कोई ऑफ़लाइन ऑडियो नहीं। ब्रीफ़िंग से आइटम डाउनलोड करें (डिवाइस पर चिह्नित)।
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
              आज की ब्रीफ़िंग चिह्नित करें
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
                aria-label="चलाएँ"
                onClick={() => {
                  const i = audio.tracks.findIndex((t) => t.id === a.id);
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
                तैयार
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
