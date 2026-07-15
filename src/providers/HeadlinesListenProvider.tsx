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
import { trackAudioAnalytics } from "@/lib/listen/analytics";
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
  error: string | null;
  speed: PlaybackSpeed;
  currentTime: number;
  duration: number;
  hasPlaylist: boolean;
  initPlaylist: (tracks: HeadlineTrack[], startIndex?: number) => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  cycleSpeed: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
};

const HeadlinesListenContext = createContext<HeadlinesListenContextValue | null>(null);

export function useHeadlinesListen() {
  const ctx = useContext(HeadlinesListenContext);
  if (!ctx) throw new Error("useHeadlinesListen must be used within HeadlinesListenProvider");
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

function narrationText(track: HeadlineTrack): string {
  return `${track.headline}. ${track.transcript}`
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[#*_`>|\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function HeadlinesListenProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechStartedRef = useRef(false);
  const speechCancelledRef = useRef(false);
  const speechRateRef = useRef<PlaybackSpeed>(1);
  const [tracks, setTracks] = useState<HeadlineTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speechMode, setSpeechMode] = useState(false);
  const track = tracks[index] ?? null;

  const cancelSpeech = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    speechCancelledRef.current = true;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    speechStartedRef.current = false;
    window.setTimeout(() => {
      speechCancelledRef.current = false;
    }, 0);
  }, []);

  const initPlaylist = useCallback(
    (nextTracks: HeadlineTrack[], startIndex = 0) => {
      if (!nextTracks.length) return;
      articleSpeechController.cancel();
      cancelSpeech();
      const nextIndex = Math.min(Math.max(0, startIndex), nextTracks.length - 1);
      setTracks(nextTracks);
      setIndex(nextIndex);
      setCurrentTime(0);
      setDuration(nextTracks[nextIndex]?.durationSec ?? 0);
      setError(null);
    },
    [cancelSpeech]
  );

  useEffect(() => {
    const nextTrack = tracks[index];
    if (!nextTrack) return;
    let cancelled = false;

    const audio = getAudio(audioRef);
    audio.pause();
    cancelSpeech();
    queueMicrotask(() => {
      if (cancelled) return;
      setCurrentTime(0);
      setDuration(nextTrack.durationSec);
      setError(null);
      setSpeechMode(!nextTrack.hasVoice);
    });

    if (!nextTrack.hasVoice || !nextTrack.voiceStreamPath) {
      queueMicrotask(() => {
        if (!cancelled) setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    audio.src = nextTrack.voiceStreamPath;
    audio.playbackRate = 1;

    const onMeta = () => {
      setDuration(audio.duration || nextTrack.durationSec);
      setLoading(false);
    };
    const onError = () => {
      // A missing generated voice falls back to the browser's real TTS engine.
      setLoading(false);
      setSpeechMode(true);
      setError(null);
    };
    audio.addEventListener("loadedmetadata", onMeta, { once: true });
    audio.addEventListener("error", onError, { once: true });
    audio.load();

    return () => {
      cancelled = true;
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("error", onError);
    };
  }, [index, tracks, cancelSpeech]);

  useEffect(() => {
    speechRateRef.current = speed;
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      const completedTrack = tracks[index];
      if (completedTrack) {
        trackAudioAnalytics("audio_story_completed", {
          slug: completedTrack.slug,
          index,
          total: tracks.length,
        });
      }
      if (index < tracks.length - 1) {
        setIndex((value) => value + 1);
        setPlaying(true);
      } else {
        setPlaying(false);
        trackAudioAnalytics("audio_queue_completed", { index, total: tracks.length });
      }
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, [index, tracks]);

  useEffect(() => {
    if (!track || loading) return;
    const audio = audioRef.current;

    if (!speechMode) {
      if (!audio) return;
      if (playing) {
        audio.playbackRate = speed;
        void audio.play().catch(() => setSpeechMode(true));
      } else {
        audio.pause();
      }
      return;
    }

    if (typeof window === "undefined" || !window.speechSynthesis) {
      const unavailableTimer = window.setTimeout(() => {
        setError("Audio is unavailable on this device.");
        setPlaying(false);
      }, 0);
      return () => window.clearTimeout(unavailableTimer);
    }

    const synth = window.speechSynthesis;
    if (!playing) {
      if (synth.speaking && !synth.paused) synth.pause();
      return;
    }

    articleSpeechController.cancel();
    if (synth.paused && utteranceRef.current && speechRateRef.current === speed) {
      synth.resume();
      return;
    }
    if (speechStartedRef.current && speechRateRef.current === speed) return;

    if (speechStartedRef.current) cancelSpeech();
    const utterance = new SpeechSynthesisUtterance(narrationText(track));
    utterance.lang = track.language === "en" ? "en-IN" : "hi-IN";
    utterance.rate = speed;
    speechRateRef.current = speed;
    utteranceRef.current = utterance;
    speechStartedRef.current = true;
    utterance.onend = () => {
      if (speechCancelledRef.current) return;
      speechStartedRef.current = false;
      utteranceRef.current = null;
      trackAudioAnalytics("audio_story_completed", {
        slug: track.slug,
        index,
        total: tracks.length,
      });
      if (index < tracks.length - 1) {
        setIndex((value) => value + 1);
        setPlaying(true);
      } else {
        setPlaying(false);
        trackAudioAnalytics("audio_queue_completed", { index, total: tracks.length });
      }
    };
    utterance.onerror = () => {
      if (speechCancelledRef.current) return;
      setError("This headline could not be narrated.");
      setPlaying(false);
    };
    synth.speak(utterance);
  }, [track, tracks.length, index, playing, loading, speed, speechMode, cancelSpeech]);

  useEffect(() => {
    if (!playing || !speechMode || !track) return;
    const timer = window.setInterval(() => {
      setCurrentTime((value) => Math.min(track.durationSec, value + 0.5 * speed));
    }, 500);
    return () => window.clearInterval(timer);
  }, [playing, speechMode, speed, track]);

  useEffect(() => {
    const onArticleSpeech = () => {
      audioRef.current?.pause();
      cancelSpeech();
      setPlaying(false);
    };
    window.addEventListener(ARTICLE_SPEECH_START_EVENT, onArticleSpeech);
    return () => window.removeEventListener(ARTICLE_SPEECH_START_EVENT, onArticleSpeech);
  }, [cancelSpeech]);

  const play = useCallback(() => {
    articleSpeechController.cancel();
    setError(null);
    setPlaying(true);
    trackAudioAnalytics("audio_play", { slug: track?.slug, index, total: tracks.length });
  }, [track, index, tracks.length]);
  const pause = useCallback(() => {
    setPlaying(false);
    trackAudioAnalytics("audio_pause", { slug: track?.slug, index, total: tracks.length });
  }, [track, index, tracks.length]);
  const togglePlay = useCallback(() => {
    if (!track) return;
    if (playing) pause();
    else play();
  }, [track, playing, pause, play]);
  const stop = useCallback(() => {
    setPlaying(false);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    cancelSpeech();
    setCurrentTime(0);
  }, [cancelSpeech]);
  const next = useCallback(() => {
    if (index >= tracks.length - 1) return;
    if (track) trackAudioAnalytics("audio_story_skipped", { slug: track.slug, index, total: tracks.length });
    articleSpeechController.cancel();
    cancelSpeech();
    setIndex((value) => value + 1);
    setPlaying(true);
  }, [index, tracks.length, track, cancelSpeech]);
  const prev = useCallback(() => {
    if (index <= 0) return;
    if (track) trackAudioAnalytics("audio_story_skipped", { slug: track.slug, index, total: tracks.length });
    articleSpeechController.cancel();
    cancelSpeech();
    setIndex((value) => value - 1);
    setPlaying(true);
  }, [index, track, tracks.length, cancelSpeech]);
  const seek = useCallback(
    (time: number) => {
      const nextTime = Math.max(0, Math.min(time, duration));
      if (!speechMode && audioRef.current) audioRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    },
    [duration, speechMode]
  );
  const cycleSpeed = useCallback(() => {
    setSpeed((value) => {
      const speedIndex = PLAYBACK_SPEEDS.indexOf(value);
      return PLAYBACK_SPEEDS[(speedIndex + 1) % PLAYBACK_SPEEDS.length] ?? 1;
    });
  }, []);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !track) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.headline,
      artist: "Jan Darpan Top 10",
      album: track.categoryLabel,
    });
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ["play", play],
      ["pause", pause],
      ["nexttrack", next],
      ["previoustrack", prev],
    ];
    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Optional action unsupported by this browser.
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Optional action unsupported by this browser.
        }
      }
    };
  }, [track, playing, play, pause, next, prev]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      cancelSpeech();
    },
    [cancelSpeech]
  );

  const value = useMemo<HeadlinesListenContextValue>(
    () => ({
      tracks,
      track,
      index,
      playing,
      loading,
      error,
      speed,
      currentTime,
      duration,
      hasPlaylist: tracks.length > 0,
      initPlaylist,
      togglePlay,
      play,
      pause,
      stop,
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
      error,
      speed,
      currentTime,
      duration,
      initPlaylist,
      togglePlay,
      play,
      pause,
      stop,
      next,
      prev,
      seek,
      cycleSpeed,
    ]
  );

  return <HeadlinesListenContext.Provider value={value}>{children}</HeadlinesListenContext.Provider>;
}
