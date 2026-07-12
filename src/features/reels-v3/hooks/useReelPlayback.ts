"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NewsShortCard, ReelSlide } from "@/lib/news/shorts/types";

type UseReelPlaybackOptions = {
  short: NewsShortCard;
  active: boolean;
};

export function useReelPlayback({ short, active }: UseReelPlaybackOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progressMs, setProgressMs] = useState(0);
  const [videoProgressPct, setVideoProgressPct] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);

  const durationMs = short.durationSec * 1000;
  const hasVideo = Boolean(short.videoUrl?.trim());
  const slides: ReelSlide[] =
    short.reelSlides.length > 0
      ? short.reelSlides
      : [
          {
            id: "0",
            startMs: 0,
            endMs: durationMs,
            headline: short.headline,
            caption: short.summary60s,
            imageUrl: short.imageUrl,
          },
        ];

  const tick = useCallback(() => {
    if (hasVideo || paused) return;
    setProgressMs((prev) => {
      const next = prev + 100;
      if (next >= durationMs) return 0;
      const idx = slides.findIndex(
        (s) => next >= s.startMs && next < s.endMs
      );
      if (idx >= 0) setSlideIndex(idx);
      return next;
    });
  }, [durationMs, hasVideo, paused, slides]);

  useEffect(() => {
    if (!active) {
      setProgressMs(0);
      setSlideIndex(0);
      setPaused(false);
      setVideoProgressPct(0);
    }
  }, [active, short.slug]);

  useEffect(() => {
    const video = videoRef.current;
    if (!hasVideo || !video) return;

    if (active && !paused) {
      video.muted = muted;
      video.play().catch(() => undefined);
    } else {
      video.pause();
      if (!active) video.currentTime = 0;
    }
  }, [active, hasVideo, muted, paused]);

  useEffect(() => {
    const video = videoRef.current;
    if (!hasVideo || !video || !active) return;

    const onTime = () => {
      const dur = video.duration || short.durationSec || 1;
      setVideoProgressPct((video.currentTime / dur) * 100);
      const ms = video.currentTime * 1000;
      setProgressMs(ms);
      const idx = slides.findIndex((s) => ms >= s.startMs && ms < s.endMs);
      if (idx >= 0) setSlideIndex(idx);
    };

    video.addEventListener("timeupdate", onTime);
    return () => video.removeEventListener("timeupdate", onTime);
  }, [active, hasVideo, short.durationSec, slides]);

  useEffect(() => {
    if (!active || hasVideo || paused) return;
    const id = window.setInterval(tick, 100);
    return () => clearInterval(id);
  }, [active, hasVideo, paused, tick]);

  useEffect(() => {
    if (!active || muted || !short.hasVoice || hasVideo) {
      audioRef.current?.pause();
      return;
    }
    const audio = new Audio(short.voiceStreamPath);
    audioRef.current = audio;
    if (!paused) audio.play().catch(() => undefined);
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [active, muted, short.hasVoice, short.voiceStreamPath, hasVideo, paused]);

  const currentSlide = slides[slideIndex] ?? slides[0];
  const progressPct = hasVideo
    ? videoProgressPct
    : Math.min(100, (progressMs / durationMs) * 100);

  const slideProgressInSegment = (() => {
    const slide = slides[slideIndex];
    if (!slide) return progressPct;
    const span = slide.endMs - slide.startMs || 1;
    const local = progressMs - slide.startMs;
    return Math.min(100, Math.max(0, (local / span) * 100));
  })();

  const togglePlay = useCallback(() => {
    if (hasVideo) {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) {
        v.play().catch(() => undefined);
        setPaused(false);
      } else {
        v.pause();
        setPaused(true);
      }
    } else {
      setPaused((p) => !p);
    }
  }, [hasVideo]);

  return {
    videoRef,
    hasVideo,
    slides,
    slideIndex,
    currentSlide,
    progressMs,
    progressPct,
    slideProgressInSegment,
    muted,
    setMuted,
    paused,
    togglePlay,
  };
}
