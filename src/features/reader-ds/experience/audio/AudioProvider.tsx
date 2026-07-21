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
import {
  loadExperiencePrefs,
  saveExperiencePrefs,
  type PlaybackSpeed,
} from "../prefs";
import { formatDuration, trackHasPlayableSource, type BriefingTrack } from "./types";

type AudioContextValue = {
  tracks: BriefingTrack[];
  index: number;
  current: BriefingTrack | null;
  /** True only after media `playing` (or buffering mid-play). */
  playing: boolean;
  status: PlayerStatus;
  progress: number;
  positionSec: number;
  durationSec: number;
  speed: PlaybackSpeed;
  visible: boolean;
  fullOpen: boolean;
  errorCode: PlayerErrorCode | null;
  errorMessage: string | null;
  canPlayCurrent: boolean;
  setTracks: (tracks: BriefingTrack[]) => void;
  playAll: () => void;
  playAt: (index: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seekBy: (delta: number) => void;
  seekTo: (sec: number) => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  retry: () => void;
  closeMini: () => void;
  openFull: () => void;
  closeFull: () => void;
  reorderQueue: (from: number, to: number) => void;
};

const Ctx = createContext<AudioContextValue | null>(null);

export function useReaderAudio() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useReaderAudio requires AudioProvider");
  return v;
}

export function useReaderAudioOptional() {
  return useContext(Ctx);
}

export function AudioProvider({
  children,
  initialTracks = [],
}: {
  children: ReactNode;
  initialTracks?: BriefingTrack[];
}) {
  const [tracks, setTracksState] = useState<BriefingTrack[]>(initialTracks);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [positionSec, setPositionSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [visible, setVisible] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const [speed, setSpeedState] = useState<PlaybackSpeed>(1);
  const [errorCode, setErrorCode] = useState<PlayerErrorCode | null>(null);

  const controllerRef = useRef<ListenPlaybackController | null>(null);
  const tracksRef = useRef(tracks);
  const indexRef = useRef(index);
  const startTrackRef = useRef<(i: number, fromSec?: number) => Promise<void>>(
    async () => undefined
  );

  useEffect(() => {
    tracksRef.current = tracks;
    indexRef.current = index;
  }, [tracks, index]);

  useEffect(() => {
    const prefs = loadExperiencePrefs();
    setSpeedState(prefs.playbackSpeed);
  }, []);

  useEffect(() => {
    if (initialTracks.length) {
      setTracksState(initialTracks);
    }
  }, [initialTracks]);

  useEffect(() => {
    const controller = new ListenPlaybackController();
    controllerRef.current = controller;
    const unsub = controller.subscribe((snap) => {
      setStatus(snap.status);
      setPositionSec(snap.currentTime);
      setErrorCode(snap.errorCode);
      const track = tracksRef.current[indexRef.current];
      const dur =
        snap.duration > 0 ? snap.duration : (track?.durationSec ?? 0);
      setDurationSec(dur);
      setProgress(dur > 0 ? Math.min(1, snap.currentTime / dur) : 0);

      if (snap.status === "ended") {
        const prefs = loadExperiencePrefs();
        const i = indexRef.current;
        const list = tracksRef.current;
        if (prefs.autoplayNext && i < list.length - 1) {
          const nextIndex = i + 1;
          setIndex(nextIndex);
          queueMicrotask(() => {
            void startTrackRef.current(nextIndex, 0);
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

  const current = tracks[index] ?? null;
  const playing = showsPlayingChrome(status);
  const canPlayCurrent = trackHasPlayableSource(current);

  const setTracks = useCallback((next: BriefingTrack[]) => {
    tracksRef.current = next;
    setTracksState(next);
  }, []);

  const startTrack = useCallback(async (i: number, fromSec = 0) => {
    const list = tracksRef.current;
    if (!list.length) return;
    const clamped = Math.max(0, Math.min(i, list.length - 1));
    const track = list[clamped];
    if (!track) return;

    articleSpeechController.cancel();
    setIndex(clamped);
    setVisible(true);

    const controller = controllerRef.current;
    if (!controller) return;

    if (!trackHasPlayableSource(track)) {
      controller.loadSource({
        url: track.streamPath,
        generationStatus: track.voiceStatus ?? "unavailable",
      });
      return;
    }

    controller.setMediaSessionMeta({
      title: track.headline,
      artist: "जनदर्पण",
      album: "सुनें",
      artworkUrl: track.imageUrl,
    });

    await controller.play(
      {
        url: track.streamPath,
        generationStatus:
          track.voiceStatus === "failed" || track.voiceStatus === "unavailable"
            ? track.voiceStatus
            : undefined,
      },
      fromSec
    );
  }, []);

  useEffect(() => {
    startTrackRef.current = startTrack;
  }, [startTrack]);

  const playAt = useCallback(
    (i: number) => {
      void startTrack(i, 0);
    },
    [startTrack]
  );

  const playAll = useCallback(() => {
    if (!tracksRef.current.length) return;
    const firstPlayable = tracksRef.current.findIndex((t) =>
      trackHasPlayableSource(t)
    );
    playAt(firstPlayable >= 0 ? firstPlayable : 0);
  }, [playAt]);

  const retry = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    if (current && trackHasPlayableSource(current)) {
      void startTrack(index, 0);
      return;
    }
    controller.retry();
  }, [current, index, startTrack]);

  const value = useMemo<AudioContextValue>(
    () => ({
      tracks,
      index,
      current,
      playing,
      status,
      progress,
      positionSec,
      durationSec: durationSec || current?.durationSec || 0,
      speed,
      visible,
      fullOpen,
      errorCode,
      errorMessage: errorCode ? playerErrorMessage(errorCode, "hi") : null,
      canPlayCurrent,
      setTracks,
      playAll,
      playAt,
      toggle: () => {
        if (!current) {
          playAll();
          return;
        }
        setVisible(true);
        const controller = controllerRef.current;
        if (!controller) return;
        if (playing) {
          controller.pause();
          return;
        }
        if (!trackHasPlayableSource(current)) {
          controller.loadSource({
            url: current.streamPath,
            generationStatus: current.voiceStatus ?? "unavailable",
          });
          return;
        }
        void startTrack(
          index,
          positionSec > 0 && progress < 0.99 ? positionSec : 0
        );
      },
      next: () => {
        if (index < tracks.length - 1) {
          void startTrack(index + 1, 0);
        }
      },
      prev: () => {
        if (index > 0) {
          void startTrack(index - 1, 0);
        }
      },
      seekBy: (delta) => {
        controllerRef.current?.seekBy(delta);
      },
      seekTo: (sec) => {
        controllerRef.current?.seek(sec);
      },
      setSpeed: (s) => {
        setSpeedState(s);
        saveExperiencePrefs({ playbackSpeed: s });
        controllerRef.current?.setSpeed(s);
      },
      retry,
      closeMini: () => {
        controllerRef.current?.stop();
        setVisible(false);
        setFullOpen(false);
      },
      openFull: () => setFullOpen(true),
      closeFull: () => setFullOpen(false),
      reorderQueue: (from, to) => {
        setTracksState((list) => {
          if (
            from === to ||
            from < 0 ||
            to < 0 ||
            from >= list.length ||
            to >= list.length
          ) {
            return list;
          }
          const next = [...list];
          const [item] = next.splice(from, 1);
          next.splice(to, 0, item);
          const curId = list[index]?.id;
          const newIndex = curId ? next.findIndex((t) => t.id === curId) : index;
          setIndex(Math.max(0, newIndex));
          return next;
        });
      },
    }),
    [
      tracks,
      index,
      current,
      playing,
      status,
      progress,
      positionSec,
      durationSec,
      speed,
      visible,
      fullOpen,
      errorCode,
      canPlayCurrent,
      playAll,
      playAt,
      setTracks,
      startTrack,
      retry,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function trackTimeLabel(positionSec: number, durationSec: number) {
  return `${formatDuration(positionSec)} / ${formatDuration(durationSec)}`;
}
