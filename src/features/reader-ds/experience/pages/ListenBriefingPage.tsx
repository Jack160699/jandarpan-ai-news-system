"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { Tag } from "../../components/primitives";
import { JdIcon } from "../../components/icons";
import { useReaderAudio } from "../audio/AudioProvider";
import { briefingMeta } from "../audio/tracksFromShorts";
import type { BriefingTrack } from "../audio/types";

function ListenBody({ tracks, autoPlay }: { tracks: BriefingTrack[]; autoPlay?: boolean }) {
  const audio = useReaderAudio();
  const { setTracks, playAt } = audio;
  const autoPlayed = useRef(false);

  useEffect(() => {
    setTracks(tracks);
  }, [tracks, setTracks]);

  useEffect(() => {
    if (!autoPlay || autoPlayed.current || tracks.length === 0) return;
    autoPlayed.current = true;
    const t = window.setTimeout(() => {
      setTracks(tracks);
      playAt(0);
    }, 250);
    return () => window.clearTimeout(t);
  }, [autoPlay, tracks, setTracks, playAt]);

  const meta = briefingMeta(tracks);
  const dateLabel = new Date().toLocaleDateString("hi-IN", {
    day: "numeric",
    month: "long",
  });

  return (
    <>
      <Masthead back backHref="/" pageTitle="सुनें" />
      <div
        style={{
          flexShrink: 0,
          background: "linear-gradient(160deg, var(--jd-navy), var(--jd-navy-deep))",
          color: "var(--jd-paper)",
          padding: "18px 16px 16px",
        }}
      >
        <Tag color="var(--jd-gold)">आज की ब्रीफ़िंग · {dateLabel}</Tag>
        <h1 className="jd-serif" style={{ margin: "6px 0 3px", fontSize: 23, fontWeight: 700 }}>
          {meta.totalLabel}
        </h1>
        <div className="jd-ui" style={{ fontSize: 11.5, color: "#8ea0c4", marginBottom: 14 }}>
          हिन्दी वाचन · AI-सहायता, संपादक-सत्यापित
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            aria-label="सभी सुनें"
            onClick={() => {
              setTracks(tracks);
              audio.playAt(0);
            }}
            style={{
              width: 52,
              height: 52,
              borderRadius: 52,
              background: "var(--jd-red)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
              color: "#fff",
            }}
          >
            <JdIcon name="play" size={26} stroke={1.9} color="#fff" />
          </button>
          <button
            type="button"
            onClick={() => {
              setTracks(tracks);
              audio.playAt(0);
            }}
            className="jd-ui"
            style={{
              fontSize: 14,
              fontWeight: 800,
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            सभी सुनें
          </button>
          <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
            <Link href="/listen/downloads" aria-label="डाउनलोड" style={{ display: "flex" }}>
              <JdIcon name="download" size={22} stroke={1.8} color="var(--jd-gold-soft)" />
            </Link>
            <button
              type="button"
              aria-label="शेयर"
              data-action="share"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              <JdIcon name="share" size={22} stroke={1.8} color="var(--jd-gold-soft)" />
            </button>
          </div>
        </div>
      </div>

      <main id="main-content" role="main" style={{ flex: 1, overflow: "auto", padding: "6px 16px" }}>
        {tracks.length === 0 ? (
          <p className="jd-ui" style={{ color: "var(--jd-muted)", padding: "16px 0" }}>
            आज की ब्रीफ़िंग जल्द यहाँ उपलब्ध होगी।
          </p>
        ) : (
          tracks.map((t, i) => {
            const active = audio.index === i && audio.visible;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => audio.playAt(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom: "1px solid var(--jd-line-2)",
                  width: "100%",
                  background: "none",
                  borderLeft: "none",
                  borderRight: "none",
                  borderTop: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  className="jd-brand"
                  style={{
                    width: 26,
                    textAlign: "center",
                    fontSize: 20,
                    fontWeight: 700,
                    color: active ? "var(--jd-red)" : "var(--jd-muted)",
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="jd-serif"
                    style={{
                      fontSize: 14.5,
                      fontWeight: active ? 700 : 500,
                      color: "var(--jd-ink)",
                      lineHeight: 1.3,
                    }}
                  >
                    {t.headline}
                  </div>
                  {active ? (
                    <div
                      style={{
                        height: 3,
                        borderRadius: 3,
                        background: "var(--jd-line-2)",
                        marginTop: 6,
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.max(4, audio.progress * 100)}%`,
                          height: 3,
                          background: "var(--jd-red)",
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  ) : null}
                </div>
                <span className="jd-ui" style={{ fontSize: 11, color: "var(--jd-muted)", fontWeight: 600 }}>
                  {t.durationLabel}
                </span>
              </button>
            );
          })
        )}
        <div style={{ display: "flex", gap: 12, padding: "14px 0 8px" }}>
          <Link href="/listen/queue" className="jd-ui" style={linkChip}>
            कतार व गति
          </Link>
          <Link href="/listen/downloads" className="jd-ui" style={linkChip}>
            डाउनलोड
          </Link>
        </div>
      </main>
    </>
  );
}

const linkChip: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  color: "var(--jd-navy)",
  border: "1px solid var(--jd-line)",
  borderRadius: 2,
  padding: "8px 12px",
  textDecoration: "none",
};

/** C21 — Top-10 audio briefing hub. */
export function ListenBriefingPage({
  tracks,
  autoPlay = false,
}: {
  tracks: BriefingTrack[];
  autoPlay?: boolean;
}) {
  return (
    <ReaderShell activeNav="listen" audioTracks={tracks}>
      <ListenBody tracks={tracks} autoPlay={autoPlay} />
    </ReaderShell>
  );
}
