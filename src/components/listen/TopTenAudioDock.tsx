"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Headphones,
  ListMusic,
  LoaderCircle,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/listen/narrator";
import { trackAudioAnalytics } from "@/lib/listen/analytics";
import { RESTORE_TOP_TEN_EVENT } from "@/lib/listen/events";
import type { HeadlineTrack } from "@/lib/listen/types";
import { useHeadlinesListen } from "@/providers/HeadlinesListenProvider";

const DISMISS_KEY = "jdp-top-ten-dismissed";
type TopTenResponse = {
  tracks?: HeadlineTrack[];
  totalDurationSec?: number;
};

export function TopTenAudioDock() {
  const pathname = usePathname();
  const audio = useHeadlinesListen();
  const shownTracked = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const restore = () => {
      sessionStorage.removeItem(DISMISS_KEY);
      setDismissed(false);
    };
    window.addEventListener(RESTORE_TOP_TEN_EVENT, restore);
    return () => window.removeEventListener(RESTORE_TOP_TEN_EVENT, restore);
  }, []);

  useEffect(() => {
    if (!mounted || dismissed || shownTracked.current) return;
    shownTracked.current = true;
    trackAudioAnalytics("audio_launcher_shown");
  }, [mounted, dismissed]);

  const loadQueue = useCallback(async () => {
    if (audio.hasPlaylist) return true;
    setFetching(true);
    setFetchError(null);
    try {
      const response = await fetch("/api/listen/top-ten", { cache: "no-store" });
      if (!response.ok) throw new Error("queue_unavailable");
      const data = (await response.json()) as TopTenResponse;
      if (!data.tracks?.length) throw new Error("queue_empty");
      audio.initPlaylist(data.tracks.slice(0, 10), 0);
      return true;
    } catch {
      setFetchError("Top 10 audio is temporarily unavailable.");
      return false;
    } finally {
      setFetching(false);
    }
  }, [audio]);

  const openAndPlay = async () => {
    setExpanded(true);
    trackAudioAnalytics("audio_launcher_opened", { total: audio.tracks.length || 10 });
    const ready = await loadQueue();
    if (ready) audio.play();
  };

  const dismiss = () => {
    audio.stop();
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
    setExpanded(false);
    trackAudioAnalytics("audio_launcher_dismissed", {
      slug: audio.track?.slug,
      index: audio.index,
      total: audio.tracks.length,
    });
  };

  if (!mounted || dismissed || pathname.startsWith("/admin")) return null;

  const progress = audio.duration > 0 ? Math.min(100, (audio.currentTime / audio.duration) * 100) : 0;
  const totalDuration = audio.tracks.reduce((total, item) => total + item.durationSec, 0);
  const story = audio.track;

  if (!expanded) {
    return (
      <aside className="top-ten-dock top-ten-dock--collapsed" aria-label="Jan Darpan Top 10 audio">
        <button
          type="button"
          className="top-ten-dock__launcher"
          onClick={() => void openAndPlay()}
          aria-label="Play Jan Darpan Top 10"
        >
          {fetching ? <LoaderCircle className="is-spinning" size={18} aria-hidden /> : <Headphones size={18} aria-hidden />}
          <span>Top 10</span>
          <i className={audio.playing ? "is-playing" : ""} aria-hidden><b /><b /><b /></i>
        </button>
        <button
          type="button"
          className="top-ten-dock__dismiss"
          onClick={dismiss}
          aria-label="Dismiss Top 10 audio"
        >
          <X size={16} aria-hidden />
        </button>
      </aside>
    );
  }

  return (
    <aside className="top-ten-dock top-ten-dock--expanded" aria-label="Jan Darpan Top 10 player">
      <div className="top-ten-dock__progress" aria-hidden><span style={{ width: `${progress}%` }} /></div>
      <header className="top-ten-dock__header">
        <div>
          <span>JAN DARPAN AUDIO</span>
          <strong>Top 10</strong>
        </div>
        <button type="button" onClick={() => setExpanded(false)} aria-label="Collapse audio player">
          <ChevronDown size={19} aria-hidden />
        </button>
        <button type="button" onClick={dismiss} aria-label="Dismiss audio player">
          <X size={19} aria-hidden />
        </button>
      </header>

      {fetchError || audio.error ? (
        <div className="top-ten-dock__error" role="status">
          <p>{fetchError ?? audio.error}</p>
          <button type="button" onClick={() => void loadQueue()}>Try again</button>
        </div>
      ) : story ? (
        <>
          <div className="top-ten-dock__story">
            <p>{audio.index + 1} of {audio.tracks.length} · {story.categoryLabel}</p>
            <h2>{story.headline}</h2>
            <span>{formatDuration(audio.currentTime)} / {formatDuration(audio.duration)} · total {formatDuration(totalDuration)}</span>
          </div>
          <div className="top-ten-dock__controls">
            <button type="button" onClick={audio.prev} disabled={audio.index === 0} aria-label="Previous headline"><SkipBack size={19} aria-hidden /></button>
            <button
              type="button"
              className="top-ten-dock__play"
              onClick={audio.togglePlay}
              disabled={audio.loading}
              aria-label={audio.playing ? "Pause Top 10" : "Play Top 10"}
            >
              {audio.loading ? <LoaderCircle className="is-spinning" size={22} aria-hidden /> : audio.playing ? <Pause size={22} aria-hidden /> : <Play size={22} aria-hidden />}
            </button>
            <button type="button" onClick={audio.next} disabled={audio.index >= audio.tracks.length - 1} aria-label="Next headline"><SkipForward size={19} aria-hidden /></button>
            <button type="button" onClick={audio.cycleSpeed} aria-label={`Playback speed ${audio.speed} times`}>{audio.speed}×</button>
            <button type="button" onClick={audio.stop} aria-label="Stop audio"><Square size={17} aria-hidden /></button>
            <button type="button" onClick={() => setQueueOpen((value) => !value)} aria-expanded={queueOpen} aria-label="Show Top 10 queue"><ListMusic size={18} aria-hidden /></button>
          </div>
          <div className="top-ten-dock__actions">
            <Link href={`/story/${story.slug}`}>Open story</Link>
            <Link href="/listen">Full player</Link>
          </div>
          {queueOpen ? (
            <ol className="top-ten-dock__queue">
              {audio.tracks.map((item, itemIndex) => (
                <li key={item.id} className={itemIndex === audio.index ? "is-current" : ""}>
                  <span>{String(itemIndex + 1).padStart(2, "0")}</span>
                  <Link href={`/story/${item.slug}`}>{item.headline}</Link>
                </li>
              ))}
            </ol>
          ) : null}
        </>
      ) : (
        <div className="top-ten-dock__loading" role="status">
          <LoaderCircle className="is-spinning" size={22} aria-hidden />
          Loading today&apos;s Top 10…
        </div>
      )}
    </aside>
  );
}
