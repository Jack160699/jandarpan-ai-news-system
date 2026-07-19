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
import {
  loadExperiencePrefs,
  saveExperiencePrefs,
  type PlaybackSpeed,
} from "../prefs";
import { formatDuration, type BriefingTrack } from "./types";

type AudioContextValue = {
  tracks: BriefingTrack[];
  index: number;
  current: BriefingTrack | null;
  playing: boolean;
  progress: number;
  positionSec: number;
  speed: PlaybackSpeed;
  visible: boolean;
  fullOpen: boolean;
  setTracks: (tracks: BriefingTrack[]) => void;
  playAll: () => void;
  playAt: (index: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seekBy: (delta: number) => void;
  setSpeed: (speed: PlaybackSpeed) => void;
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
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [positionSec, setPositionSec] = useState(0);
  const [visible, setVisible] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const [speed, setSpeedState] = useState<PlaybackSpeed>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tickRef = useRef<number | null>(null);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  useEffect(() => {
    const prefs = loadExperiencePrefs();
    setSpeedState(prefs.playbackSpeed);
  }, []);

  useEffect(() => {
    if (initialTracks.length) {
      setTracksState(initialTracks);
    }
  }, [initialTracks]);

  const current = tracks[index] ?? null;

  const setTracks = useCallback((next: BriefingTrack[]) => {
    tracksRef.current = next;
    setTracksState(next);
  }, []);

  const clearTick = () => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const stopAudioEl = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const startSim = useCallback(
    (track: BriefingTrack, fromSec = 0) => {
      clearTick();
      stopAudioEl();
      let pos = fromSec;
      const duration = Math.max(1, track.durationSec);
      tickRef.current = window.setInterval(() => {
        pos += 0.25 * speed;
        if (pos >= duration) {
          clearTick();
          setProgress(1);
          setPositionSec(duration);
          setPlaying(false);
          setIndex((i) => {
            const prefs = loadExperiencePrefs();
            if (prefs.autoplayNext && i < tracks.length - 1) {
              setPlaying(true);
              return i + 1;
            }
            return i;
          });
          return;
        }
        setPositionSec(pos);
        setProgress(pos / duration);
      }, 250);
    },
    [speed, tracks.length]
  );

  const startRealOrSim = useCallback(
    (track: BriefingTrack, fromSec = 0) => {
      clearTick();
      stopAudioEl();
      if (track.streamPath) {
        const el = new Audio(track.streamPath);
        el.playbackRate = speed;
        el.currentTime = fromSec;
        audioRef.current = el;
        el.ontimeupdate = () => {
          const dur = el.duration || track.durationSec;
          setPositionSec(el.currentTime);
          setProgress(dur ? el.currentTime / dur : 0);
        };
        el.onended = () => {
          setPlaying(false);
          setIndex((i) => {
            const prefs = loadExperiencePrefs();
            if (prefs.autoplayNext && i < tracks.length - 1) {
              queueMicrotask(() => setPlaying(true));
              return i + 1;
            }
            return i;
          });
        };
        void el.play().catch(() => startSim(track, fromSec));
        return;
      }
      startSim(track, fromSec);
    },
    [speed, startSim, tracks.length]
  );

  useEffect(() => {
    if (!playing || !current) {
      clearTick();
      if (audioRef.current) audioRef.current.pause();
      return;
    }
    startRealOrSim(current, positionSec > 0 && progress < 0.99 ? positionSec : 0);
    return () => {
      clearTick();
      stopAudioEl();
    };
    // intentionally re-run when index/playing/speed/current changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, index, speed, current?.id]);

  const playAt = useCallback((i: number) => {
    if (!tracksRef.current.length) return;
    setIndex(Math.max(0, Math.min(i, tracksRef.current.length - 1)));
    setProgress(0);
    setPositionSec(0);
    setVisible(true);
    setPlaying(true);
  }, []);

  const playAll = useCallback(() => {
    if (!tracksRef.current.length) return;
    playAt(0);
  }, [playAt]);

  const value = useMemo<AudioContextValue>(
    () => ({
      tracks,
      index,
      current,
      playing,
      progress,
      positionSec,
      speed,
      visible,
      fullOpen,
      setTracks,
      playAll,
      playAt,
      toggle: () => {
        if (!current) {
          playAll();
          return;
        }
        setVisible(true);
        setPlaying((p) => !p);
      },
      next: () => {
        if (index < tracks.length - 1) {
          setIndex(index + 1);
          setProgress(0);
          setPositionSec(0);
          setPlaying(true);
          setVisible(true);
        }
      },
      prev: () => {
        if (index > 0) {
          setIndex(index - 1);
          setProgress(0);
          setPositionSec(0);
          setPlaying(true);
        }
      },
      seekBy: (delta) => {
        if (!current) return;
        const nextPos = Math.max(
          0,
          Math.min(current.durationSec, positionSec + delta)
        );
        setPositionSec(nextPos);
        setProgress(nextPos / current.durationSec);
        if (audioRef.current) audioRef.current.currentTime = nextPos;
      },
      setSpeed: (s) => {
        setSpeedState(s);
        saveExperiencePrefs({ playbackSpeed: s });
        if (audioRef.current) audioRef.current.playbackRate = s;
      },
      closeMini: () => {
        setPlaying(false);
        setVisible(false);
        setFullOpen(false);
        clearTick();
        stopAudioEl();
      },
      openFull: () => setFullOpen(true),
      closeFull: () => setFullOpen(false),
      reorderQueue: (from, to) => {
        setTracksState((list) => {
          if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
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
      progress,
      positionSec,
      speed,
      visible,
      fullOpen,
      playAll,
      playAt,
      setTracks,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function trackTimeLabel(positionSec: number, durationSec: number) {
  return `${formatDuration(positionSec)} / ${formatDuration(durationSec)}`;
}
