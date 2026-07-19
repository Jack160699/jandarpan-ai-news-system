"use client";

import { useEffect, useState } from "react";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { JdIcon } from "../../components/icons";
import { useReaderAudio } from "../audio/AudioProvider";
import {
  loadExperiencePrefs,
  saveExperiencePrefs,
  type PlaybackSpeed,
} from "../prefs";
import { Toggle } from "../components/Toggle";
import type { BriefingTrack } from "../audio/types";

const SPEEDS: PlaybackSpeed[] = [0.75, 1, 1.25, 1.5, 1.75, 2];

function QueueBody({ seed }: { seed: BriefingTrack[] }) {
  const audio = useReaderAudio();
  const [autoplay, setAutoplay] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(true);

  const { setTracks, tracks: audioTracks } = audio;

  useEffect(() => {
    if (seed.length && audioTracks.length === 0) setTracks(seed);
  }, [seed, audioTracks.length, setTracks]);

  useEffect(() => {
    const p = loadExperiencePrefs();
    setAutoplay(p.autoplayNext);
    setWifiOnly(p.wifiOnlyDownload);
  }, []);

  const cycleSpeed = () => {
    const i = SPEEDS.indexOf(audio.speed);
    audio.setSpeed(SPEEDS[(i + 1) % SPEEDS.length]);
  };

  const queue = audio.tracks.slice(audio.index + 1);

  return (
    <>
      <Masthead back backHref="/listen" pageTitle="कतार" />
      <div
        style={{
          flexShrink: 0,
          padding: "12px 16px",
          background: "var(--jd-paper-2)",
          borderBottom: "1px solid var(--jd-line)",
        }}
      >
        <Row
          label="प्लेबैक गति"
          value={`${audio.speed.toFixed(2).replace(/\.00$/, ".0").replace(/(\.\d)0$/, "$1")}x`}
          onClick={cycleSpeed}
        />
        <Row
          label="ऑटो-प्ले अगला"
          right={
            <Toggle
              on={autoplay}
              label="ऑटो-प्ले"
              onChange={(v) => {
                setAutoplay(v);
                saveExperiencePrefs({ autoplayNext: v });
              }}
            />
          }
        />
        <Row
          label="डाउनलोड केवल वाई-फ़ाई पर"
          right={
            <Toggle
              on={wifiOnly}
              label="वाई-फ़ाई डाउनलोड"
              onChange={(v) => {
                setWifiOnly(v);
                saveExperiencePrefs({ wifiOnlyDownload: v });
              }}
            />
          }
        />
      </div>
      <main id="main-content" role="main" style={{ flex: 1, overflow: "auto", padding: "6px 16px" }}>
        <div
          className="jd-ui"
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: ".1em",
            color: "var(--jd-muted)",
            textTransform: "uppercase",
            margin: "8px 0",
          }}
        >
          आगे की कतार
        </div>
        {queue.length === 0 ? (
          <p className="jd-ui" style={{ color: "var(--jd-muted)", fontSize: 13 }}>
            कतार खाली है — ब्रीफ़िंग से कोई आइटम चलाएँ।
          </p>
        ) : (
          queue.map((t, i) => {
            const absolute = audio.index + 1 + i;
            return (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom: "1px solid var(--jd-line-2)",
                }}
              >
                <button
                  type="button"
                  aria-label="ऊपर ले जाएँ"
                  disabled={i === 0}
                  onClick={() => audio.reorderQueue(absolute, absolute - 1)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                >
                  <JdIcon name="list" size={18} stroke={1.7} color="var(--jd-muted)" />
                </button>
                <button
                  type="button"
                  onClick={() => audio.playAt(absolute)}
                  style={{
                    flex: 1,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    padding: 0,
                  }}
                >
                  <div className="jd-serif" style={{ fontSize: 14, fontWeight: 500, color: "var(--jd-ink)", lineHeight: 1.3 }}>
                    {t.headline}
                  </div>
                </button>
                <span className="jd-ui" style={{ fontSize: 11, color: "var(--jd-muted)" }}>
                  {t.durationLabel}
                </span>
              </div>
            );
          })
        )}
      </main>
    </>
  );
}

function Row({
  label,
  value,
  right,
  onClick,
}: {
  label: string;
  value?: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
      tabIndex={onClick ? 0 : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "7px 0",
        cursor: onClick ? "pointer" : "default",
        minHeight: 44,
      }}
    >
      <span className="jd-ui" style={{ fontSize: 13, fontWeight: 600, color: "var(--jd-ink-2)" }}>
        {label}
      </span>
      {right ?? (
        <span className="jd-ui" style={{ fontSize: 12, fontWeight: 800, color: "var(--jd-red)" }}>
          {value}
        </span>
      )}
    </div>
  );
}

/** C24 — queue + playback speed / autoplay / wifi download. */
export function AudioQueuePage({ tracks }: { tracks: BriefingTrack[] }) {
  return (
    <ReaderShell activeNav="listen" audioTracks={tracks}>
      <QueueBody seed={tracks} />
    </ReaderShell>
  );
}
