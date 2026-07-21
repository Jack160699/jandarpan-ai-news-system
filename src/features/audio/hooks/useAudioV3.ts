"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlaybackSpeed } from "@/lib/listen/types";
import { ListenPlaybackController } from "@/lib/listen/playback-controller";
import {
  playerErrorMessage,
  showsPlayingChrome,
  type PlayerErrorCode,
  type PlayerStatus,
} from "@/lib/listen/player-state";
import { AUDIO_VOICES_PLACEHOLDER } from "../data/placeholders";
import type { AudioTrack } from "../types";

export type UseAudioV3Options = {
  tracks: AudioTrack[];
  autoPlay?: boolean;
  initialIndex?: number;
};

function trackPlayable(track: AudioTrack | null | undefined): boolean {
  if (!track?.streamPath?.trim()) return false;
  if (track.voiceStatus === "failed" || track.voiceStatus === "unavailable") {
    return false;
  }
  return true;
}

export function useAudioV3({ tracks, autoPlay = false, initialIndex = 0 }: UseAudioV3Options) {
  const [index, setIndex] = useState(initialIndex);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepRemainingSec, setSleepRemainingSec] = useState<number | null>(null);
  const [voiceId, setVoiceId] = useState(AUDIO_VOICES_PLACEHOLDER[0]?.id ?? "hi-female-1");
  const [fullPlayerOpen, setFullPlayerOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [errorCode, setErrorCode] = useState<PlayerErrorCode | null>(null);

  const controllerRef = useRef<ListenPlaybackController | null>(null);
  const tracksRef = useRef(tracks);
  const indexRef = useRef(index);
  const playAtRef = useRef<(trackIndex: number) => Promise<void>>(async () => undefined);

  useEffect(() => {
    tracksRef.current = tracks;
    indexRef.current = index;
  }, [tracks, index]);

  const track = tracks[index] ?? null;
  const duration = mediaDuration > 0 ? mediaDuration : track?.durationSec ?? 0;
  const playing = showsPlayingChrome(status);
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    const controller = new ListenPlaybackController();
    controllerRef.current = controller;
    const unsub = controller.subscribe((snap) => {
      setStatus(snap.status);
      setCurrentTime(snap.currentTime);
      setErrorCode(snap.errorCode);
      const t = tracksRef.current[indexRef.current];
      setMediaDuration(snap.duration > 0 ? snap.duration : (t?.durationSec ?? 0));

      if (snap.status === "ended") {
        const i = indexRef.current;
        const list = tracksRef.current;
        if (i < list.length - 1) {
          const next = i + 1;
          setIndex(next);
          queueMicrotask(() => {
            void playAtRef.current(next);
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

  const playAt = useCallback(async (trackIndex: number) => {
    const list = tracksRef.current;
    if (trackIndex < 0 || trackIndex >= list.length) return;
    const nextTrack = list[trackIndex];
    if (!nextTrack) return;
    setIndex(trackIndex);
    const controller = controllerRef.current;
    if (!controller) return;

    if (!trackPlayable(nextTrack)) {
      controller.loadSource({
        url: nextTrack.streamPath,
        generationStatus: nextTrack.voiceStatus ?? "unavailable",
      });
      return;
    }

    controller.setMediaSessionMeta({
      title: nextTrack.headline,
      artist: "जनदर्पण",
      album: "सुनें",
    });
    await controller.play(
      {
        url: nextTrack.streamPath,
        generationStatus:
          nextTrack.voiceStatus === "failed" ||
          nextTrack.voiceStatus === "unavailable"
            ? nextTrack.voiceStatus
            : undefined,
      },
      0
    );
  }, []);

  useEffect(() => {
    playAtRef.current = playAt;
  }, [playAt]);

  useEffect(() => {
    if (!autoPlay || !tracks.length) return;
    const first = tracks.findIndex((t) => trackPlayable(t));
    if (first < 0) return;
    void playAt(first);
    // intentionally only when autoPlay mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  const togglePlay = useCallback(() => {
    if (playing) {
      controllerRef.current?.pause();
      return;
    }
    void playAt(indexRef.current);
  }, [playing, playAt]);

  const play = useCallback(() => {
    void playAt(indexRef.current);
  }, [playAt]);

  const pause = useCallback(() => {
    controllerRef.current?.pause();
  }, []);

  const next = useCallback(() => {
    void playAt(Math.min(indexRef.current + 1, tracksRef.current.length - 1));
  }, [playAt]);

  const prev = useCallback(() => {
    void playAt(Math.max(indexRef.current - 1, 0));
  }, [playAt]);

  const seekTo = useCallback((seconds: number) => {
    controllerRef.current?.seek(seconds);
  }, []);

  const playTrackAt = useCallback(
    (trackIndex: number) => {
      void playAt(trackIndex);
    },
    [playAt]
  );

  const playTrackById = useCallback(
    (trackId: string) => {
      const trackIndex = tracks.findIndex((t) => t.id === trackId);
      if (trackIndex >= 0) playTrackAt(trackIndex);
    },
    [tracks, playTrackAt]
  );

  const retry = useCallback(() => {
    void playAt(indexRef.current);
  }, [playAt]);

  const clearSleepTimer = useCallback(() => {
    setSleepTimerMinutes(null);
    setSleepRemainingSec(null);
  }, []);

  const startSleepTimer = useCallback((minutes: number) => {
    setSleepTimerMinutes(minutes);
    setSleepRemainingSec(minutes * 60);
  }, []);

  useEffect(() => {
    if (sleepRemainingSec == null || sleepRemainingSec <= 0) return undefined;

    const timer = window.setInterval(() => {
      setSleepRemainingSec((prev) => {
        if (prev == null || prev <= 1) {
          controllerRef.current?.pause();
          setSleepTimerMinutes(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [sleepRemainingSec]);

  const selectedVoice = useMemo(
    () => AUDIO_VOICES_PLACEHOLDER.find((v) => v.id === voiceId) ?? AUDIO_VOICES_PLACEHOLDER[0],
    [voiceId]
  );

  return {
    tracks,
    track,
    index,
    playing,
    status,
    currentTime,
    duration,
    progressPct,
    speed,
    setSpeed,
    voiceId,
    setVoiceId,
    selectedVoice,
    sleepTimerMinutes,
    sleepRemainingSec,
    startSleepTimer,
    clearSleepTimer,
    fullPlayerOpen,
    setFullPlayerOpen,
    queueOpen,
    setQueueOpen,
    transcriptOpen,
    setTranscriptOpen,
    togglePlay,
    play,
    pause,
    next,
    prev,
    seekTo,
    playTrackAt,
    playTrackById,
    retry,
    errorCode,
    errorMessage: errorCode ? playerErrorMessage(errorCode, "hi") : null,
    canPlayCurrent: trackPlayable(track),
  };
}

export type UseAudioV3Return = ReturnType<typeof useAudioV3>;
