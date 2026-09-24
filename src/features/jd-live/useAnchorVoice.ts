"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBroadcast } from "./BroadcastContext";
import type { BroadcastLanguage } from "./types";
import { speechController } from "./speechController";
import {
  playTransitionSting,
  playBreakingSting,
} from "./audioStings";

/**
 * Hook interface to the singleton broadcast speech controller.
 * Eliminates all numbering and repetitive intros.
 * Provides deterministic pause, resume, mute, and lip-sync amplitude integration.
 */
export function useAnchorVoice() {
  const { state, dispatch } = useBroadcast();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeTokenRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const getAudioCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === "suspended") {
        void audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  const stop = useCallback(() => {
    speechController.cancelSpeechOnly();
    setIsPlaying(false);
    dispatch({ type: "SET_ANCHOR_STATE", state: "idle" });
    dispatch({ type: "SET_AMPLITUDE", amplitude: 0 });
  }, [dispatch]);

  const speak = useCallback(
    async (params: {
      script: string;
      language: BroadcastLanguage;
      isBreaking?: boolean;
      segmentToken: number;
    }): Promise<number> => {
      const { script, language, isBreaking, segmentToken } = params;
      activeTokenRef.current = segmentToken;

      dispatch({ type: "SET_AUDIO_READY", ready: true });

      // Play audio sting if unmuted
      if (!speechController.getIsMuted() && !speechController.getIsPaused()) {
        const ctx = getAudioCtx();
        if (ctx) {
          try {
            if (isBreaking) {
              playBreakingSting(ctx);
              await new Promise((r) => setTimeout(r, 400));
            } else {
              playTransitionSting(ctx);
              await new Promise((r) => setTimeout(r, 220));
            }
          } catch {}
        }
      }

      if (activeTokenRef.current !== segmentToken || speechController.getIsPaused()) {
        return 0;
      }

      return new Promise<number>((resolve) => {
        speechController.speakStory(script, {
          language,
          token: segmentToken,
          callbacks: {
            onStart: () => {
              if (activeTokenRef.current === segmentToken) {
                setIsPlaying(true);
                dispatch({ type: "SET_ANCHOR_STATE", state: "speaking" });
              }
            },
            onEnd: (durationMs) => {
              if (activeTokenRef.current === segmentToken) {
                setIsPlaying(false);
                dispatch({ type: "SET_ANCHOR_STATE", state: "idle" });
                dispatch({ type: "SET_AMPLITUDE", amplitude: 0 });
                resolve(durationMs);
              }
            },
            onAmplitude: (amplitude) => {
              if (activeTokenRef.current === segmentToken) {
                dispatch({ type: "SET_AMPLITUDE", amplitude });
              }
            },
            onBlocked: () => {
              if (activeTokenRef.current === segmentToken) {
                dispatch({ type: "SET_AUDIO_BLOCKED", blocked: true });
                dispatch({ type: "SET_MUTED", isMuted: true });
              }
            },
            onError: () => {
              if (activeTokenRef.current === segmentToken) {
                setIsPlaying(false);
                dispatch({ type: "SET_ANCHOR_STATE", state: "idle" });
                resolve(0);
              }
            },
          },
        });
      });
    },
    [dispatch, getAudioCtx]
  );

  // Resume clean playback when returning to visible tab if unmuted
  useEffect(() => {
    const handleVisibility = () => {
      if (
        typeof window !== "undefined" &&
        !document.hidden &&
        "speechSynthesis" in window &&
        !speechController.getIsPaused() &&
        !speechController.getIsMuted()
      ) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stop]);

  return { speak, stop, isPlaying };
}
