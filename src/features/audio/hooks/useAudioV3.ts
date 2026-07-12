"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlaybackSpeed } from "@/lib/listen/types";
import { AUDIO_VOICES_PLACEHOLDER } from "../data/placeholders";
import type { AudioTrack } from "../types";

export type UseAudioV3Options = {
  tracks: AudioTrack[];
  autoPlay?: boolean;
  initialIndex?: number;
};

export function useAudioV3({ tracks, autoPlay = false, initialIndex = 0 }: UseAudioV3Options) {
  const [index, setIndex] = useState(initialIndex);
  const [playing, setPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepRemainingSec, setSleepRemainingSec] = useState<number | null>(null);
  const [voiceId, setVoiceId] = useState(AUDIO_VOICES_PLACEHOLDER[0]?.id ?? "hi-female-1");
  const [fullPlayerOpen, setFullPlayerOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(true);

  const track = tracks[index] ?? null;
  const duration = track?.durationSec ?? 0;
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const togglePlay = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, tracks.length - 1));
    setCurrentTime(0);
  }, [tracks.length]);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
    setCurrentTime(0);
  }, []);

  const seekTo = useCallback(
    (seconds: number) => {
      setCurrentTime(Math.max(0, Math.min(seconds, duration)));
    },
    [duration],
  );

  const playTrackAt = useCallback(
    (trackIndex: number) => {
      if (trackIndex < 0 || trackIndex >= tracks.length) return;
      setIndex(trackIndex);
      setCurrentTime(0);
      setPlaying(true);
    },
    [tracks.length],
  );

  const playTrackById = useCallback(
    (trackId: string) => {
      const trackIndex = tracks.findIndex((t) => t.id === trackId);
      if (trackIndex >= 0) playTrackAt(trackIndex);
    },
    [tracks, playTrackAt],
  );

  const clearSleepTimer = useCallback(() => {
    setSleepTimerMinutes(null);
    setSleepRemainingSec(null);
  }, []);

  const startSleepTimer = useCallback((minutes: number) => {
    setSleepTimerMinutes(minutes);
    setSleepRemainingSec(minutes * 60);
  }, []);

  useEffect(() => {
    if (!playing || !track) return undefined;

    const intervalMs = 1000 / speed;
    const timer = window.setInterval(() => {
      setCurrentTime((t) => {
        if (t >= duration) {
          if (index < tracks.length - 1) {
            setIndex((i) => i + 1);
            return 0;
          }
          setPlaying(false);
          return duration;
        }
        return t + 1;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [playing, track, duration, index, tracks.length, speed]);

  useEffect(() => {
    setCurrentTime(0);
  }, [index]);

  useEffect(() => {
    if (sleepRemainingSec == null || sleepRemainingSec <= 0) return undefined;

    const timer = window.setInterval(() => {
      setSleepRemainingSec((prev) => {
        if (prev == null || prev <= 1) {
          setPlaying(false);
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
    [voiceId],
  );

  return {
    tracks,
    track,
    index,
    playing,
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
  };
}

export type UseAudioV3Return = ReturnType<typeof useAudioV3>;
