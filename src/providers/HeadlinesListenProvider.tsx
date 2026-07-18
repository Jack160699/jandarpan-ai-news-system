"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { HeadlineTrack, PlaybackSpeed } from "@/lib/listen/types";
import { PLAYBACK_SPEEDS } from "@/lib/listen/types";
import {
  ARTICLE_SPEECH_START_EVENT,
  articleSpeechController,
} from "@/lib/speech/article-speech-controller";

type HeadlinesListenContextValue = {
  tracks: HeadlineTrack[];
  track: HeadlineTrack | null;
  index: number;
  playing: boolean;
  loading: boolean;
  speed: PlaybackSpeed;
  currentTime: number;
  duration: number;
  hasPlaylist: boolean;
  initPlaylist: (tracks: HeadlineTrack[], startIndex?: number) => void;
  clearPlaylist: () => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  cycleSpeed: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
};

const HeadlinesListenContext = createContext<HeadlinesListenContextValue | null>(
  null
);

export function useHeadlinesListen() {
  const ctx = useContext(HeadlinesListenContext);
  if (!ctx) {
    throw new Error("useHeadlinesListen must be used within HeadlinesListenProvider");
  }
  return ctx;
}

export function useHeadlinesListenOptional() {
  return useContext(HeadlinesListenContext);
}

function getAudio(ref: { current: HTMLAudioElement | null }) {
  if (!ref.current) {
    ref.current = new Audio();
    ref.current.preload = "metadata";
  }
  return ref.current;
}

export function HeadlinesListenProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tracks, setTracks] = useState<HeadlineTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const track = tracks[index] ?? null;

  const initPlaylist = useCallback(
    (nextTracks: HeadlineTrack[], startIndex = 0) => {
      if (!nextTracks.length) return;
      articleSpeechController.cancel();
      const i = Math.min(Math.max(0, startIndex), nextTracks.length - 1);
      setTracks(nextTracks);
      setIndex(i);
      setCurrentTime(0);
      setDuration(nextTracks[i]?.durationSec ?? 0);
    },
    []
  );

  useEffect(() => {
    const t = tracks[index];
    if (!t) return;

    const audio = getAudio(audioRef);
    setLoading(true);
    setCurrentTime(0);
    setDuration(t.durationSec);

    const onMeta = () => {
      setDuration(audio.duration || t.durationSec);
      setLoading(false);
    };
    const onErr = () => {
      setLoading(false);
      setPlaying(false);
    };

    audio.pause();
    audio.src = t.voiceStreamPath;
    audio.playbackRate = speed;
    audio.addEventListener("loadedmetadata", onMeta, { once: true });
    audio.addEventListener("error", onErr, { once: true });
    audio.load();

    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("error", onErr);
    };
  }, [index, tracks, speed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      if (index < tracks.length - 1) {
        setIndex((i) => i + 1);
        setPlaying(true);
      } else {
        setPlaying(false);
      }
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, [index, tracks.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || loading) return;

    if (playing) {
      audio.playbackRate = speed;
      void audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [playing, loading, speed]);

  useEffect(() => {
    const onArticleSpeech = () => {
      const audio = audioRef.current;
      audio?.pause();
      setPlaying(false);
    };
    window.addEventListener(ARTICLE_SPEECH_START_EVENT, onArticleSpeech);
    return () =>
      window.removeEventListener(ARTICLE_SPEECH_START_EVENT, onArticleSpeech);
  }, []);

  const togglePlay = useCallback(() => {
    if (!track) return;
    setPlaying((p) => {
      const next = !p;
      if (next) articleSpeechController.cancel();
      return next;
    });
  }, [track]);

  const play = useCallback(() => {
    articleSpeechController.cancel();
    setPlaying(true);
  }, []);
  const pause = useCallback(() => setPlaying(false), []);

  /** Close the player entirely — stop audio and drop the playlist */
  const clearPlaylist = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
    }
    setPlaying(false);
    setTracks([]);
    setIndex(0);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const next = useCallback(() => {
    if (index < tracks.length - 1) {
      articleSpeechController.cancel();
      setIndex((i) => i + 1);
      setPlaying(true);
    }
  }, [index, tracks.length]);

  const prev = useCallback(() => {
    if (index > 0) {
      articleSpeechController.cancel();
      setIndex((i) => i - 1);
      setPlaying(true);
    }
  }, [index]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeed((s) => {
      const idx = PLAYBACK_SPEEDS.indexOf(s);
      return PLAYBACK_SPEEDS[(idx + 1) % PLAYBACK_SPEEDS.length] ?? 1;
    });
  }, []);

  const value = useMemo<HeadlinesListenContextValue>(
    () => ({
      tracks,
      track,
      index,
      playing,
      loading,
      speed,
      currentTime,
      duration,
      hasPlaylist: tracks.length > 0,
      initPlaylist,
      clearPlaylist,
      togglePlay,
      play,
      pause,
      next,
      prev,
      seek,
      cycleSpeed,
      setSpeed,
    }),
    [
      tracks,
      track,
      index,
      playing,
      loading,
      speed,
      currentTime,
      duration,
      initPlaylist,
      clearPlaylist,
      togglePlay,
      play,
      pause,
      next,
      prev,
      seek,
      cycleSpeed,
    ]
  );

  return (
    <HeadlinesListenContext.Provider value={value}>
      {children}
    </HeadlinesListenContext.Provider>
  );
}
