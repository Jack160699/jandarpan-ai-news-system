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
import { ListenPlaybackController } from "@/lib/listen/playback-controller";
import {
  playerErrorMessage,
  showsPlayingChrome,
  type PlayerErrorCode,
  type PlayerStatus,
} from "@/lib/listen/player-state";
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
  status: PlayerStatus;
  speed: PlaybackSpeed;
  currentTime: number;
  duration: number;
  hasPlaylist: boolean;
  errorCode: PlayerErrorCode | null;
  errorMessage: string | null;
  initPlaylist: (tracks: HeadlineTrack[], startIndex?: number) => void;
  clearPlaylist: () => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  retry: () => void;
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

export function HeadlinesListenProvider({ children }: { children: ReactNode }) {
  const controllerRef = useRef<ListenPlaybackController | null>(null);
  const [tracks, setTracks] = useState<HeadlineTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errorCode, setErrorCode] = useState<PlayerErrorCode | null>(null);
  const tracksRef = useRef(tracks);
  const indexRef = useRef(index);
  const playIndexRef = useRef<(i: number) => Promise<void>>(async () => undefined);

  useEffect(() => {
    tracksRef.current = tracks;
    indexRef.current = index;
  }, [tracks, index]);

  const track = tracks[index] ?? null;
  const playing = showsPlayingChrome(status);
  const loading = status === "loading" || status === "buffering";

  useEffect(() => {
    const controller = new ListenPlaybackController();
    controllerRef.current = controller;
    const unsub = controller.subscribe((snap) => {
      setStatus(snap.status);
      setCurrentTime(snap.currentTime);
      setErrorCode(snap.errorCode);
      const t = tracksRef.current[indexRef.current];
      const dur = snap.duration > 0 ? snap.duration : (t?.durationSec ?? 0);
      setDuration(dur);

      if (snap.status === "ended") {
        const i = indexRef.current;
        const list = tracksRef.current;
        if (i < list.length - 1) {
          const next = i + 1;
          setIndex(next);
          queueMicrotask(() => {
            void playIndexRef.current(next);
          });
        }
      }
    });
    return () => {
      unsub();
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.setSpeed(speed);
  }, [speed]);

  useEffect(() => {
    const onArticleSpeech = () => {
      controllerRef.current?.pause();
    };
    window.addEventListener(ARTICLE_SPEECH_START_EVENT, onArticleSpeech);
    return () =>
      window.removeEventListener(ARTICLE_SPEECH_START_EVENT, onArticleSpeech);
  }, []);

  const playIndex = useCallback(async (i: number) => {
    const list = tracksRef.current;
    const t = list[i];
    if (!t) return;
    articleSpeechController.cancel();
    setIndex(i);
    const controller = controllerRef.current;
    if (!controller) return;
    controller.setMediaSessionMeta({
      title: t.headline,
      artist: "जनदर्पण",
      album: "सुनें",
    });
    await controller.play({ url: t.voiceStreamPath }, 0);
  }, []);

  useEffect(() => {
    playIndexRef.current = playIndex;
  }, [playIndex]);

  const initPlaylist = useCallback(
    (nextTracks: HeadlineTrack[], startIndex = 0) => {
      if (!nextTracks.length) return;
      articleSpeechController.cancel();
      const i = Math.min(Math.max(0, startIndex), nextTracks.length - 1);
      setTracks(nextTracks);
      tracksRef.current = nextTracks;
      setIndex(i);
      setCurrentTime(0);
      setDuration(nextTracks[i]?.durationSec ?? 0);
      setErrorCode(null);
      const url = nextTracks[i]?.voiceStreamPath;
      if (url) {
        controllerRef.current?.loadSource({ url });
      } else {
        controllerRef.current?.loadSource({
          url: null,
          generationStatus: "unavailable",
        });
      }
    },
    []
  );

  const clearPlaylist = useCallback(() => {
    controllerRef.current?.stop();
    setTracks([]);
    tracksRef.current = [];
    setIndex(0);
    setCurrentTime(0);
    setDuration(0);
    setErrorCode(null);
    setStatus("idle");
  }, []);

  const play = useCallback(() => {
    void playIndex(indexRef.current);
  }, [playIndex]);

  const pause = useCallback(() => {
    controllerRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    if (!tracksRef.current[indexRef.current]) return;
    if (showsPlayingChrome(status)) {
      pause();
    } else {
      play();
    }
  }, [status, pause, play]);

  const next = useCallback(() => {
    if (index < tracks.length - 1) {
      void playIndex(index + 1);
    }
  }, [index, tracks.length, playIndex]);

  const prev = useCallback(() => {
    if (index > 0) {
      void playIndex(index - 1);
    }
  }, [index, playIndex]);

  const seek = useCallback((time: number) => {
    controllerRef.current?.seek(time);
  }, []);

  const retry = useCallback(() => {
    void playIndex(indexRef.current);
  }, [playIndex]);

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
      status,
      speed,
      currentTime,
      duration,
      hasPlaylist: tracks.length > 0,
      errorCode,
      errorMessage: errorCode ? playerErrorMessage(errorCode, "hi") : null,
      initPlaylist,
      clearPlaylist,
      togglePlay,
      play,
      pause,
      next,
      prev,
      seek,
      retry,
      cycleSpeed,
      setSpeed,
    }),
    [
      tracks,
      track,
      index,
      playing,
      loading,
      status,
      speed,
      currentTime,
      duration,
      errorCode,
      initPlaylist,
      clearPlaylist,
      togglePlay,
      play,
      pause,
      next,
      prev,
      seek,
      retry,
      cycleSpeed,
    ]
  );

  return (
    <HeadlinesListenContext.Provider value={value}>
      {children}
    </HeadlinesListenContext.Provider>
  );
}
