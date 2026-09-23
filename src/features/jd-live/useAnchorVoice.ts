"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBroadcast } from "./BroadcastContext";
import type { BroadcastLanguage } from "./types";

/**
 * Manages TTS audio playback and lip-sync amplitude extraction.
 * Falls back to Web Speech API when server TTS is unavailable.
 */
export function useAnchorVoice() {
  const { state, dispatch } = useBroadcast();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | MediaElementAudioSourceNode | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Ensure AudioContext is initialized (must happen after user gesture)
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.connect(audioCtxRef.current.destination);
    }
    return { ctx: audioCtxRef.current, analyser: analyserRef.current! };
  }, []);

  // Poll analyser for amplitude → dispatch to context
  const startAmplitudeLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
      analyser.getByteFrequencyData(data);
      // Average mid-range frequencies for speech amplitude
      const sum = data.slice(4, 20).reduce((a, b) => a + b, 0);
      const amplitude = Math.min(1, sum / (16 * 180));
      dispatch({ type: "SET_AMPLITUDE", amplitude });
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
  }, [dispatch]);

  const stopAmplitudeLoop = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    dispatch({ type: "SET_AMPLITUDE", amplitude: 0 });
  }, [dispatch]);

  /** Play via server TTS (OpenAI) */
  const playServerTts = useCallback(
    async (ttsUrl: string): Promise<number> => {
      return new Promise((resolve) => {
        const { ctx, analyser } = getAudioCtx();

        if (audioElRef.current) {
          audioElRef.current.pause();
        }

        const audio = new Audio(ttsUrl);
        audio.crossOrigin = "anonymous";
        audioElRef.current = audio;

        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        sourceRef.current = source;

        audio.onplay = () => {
          setIsPlaying(true);
          dispatch({ type: "SET_ANCHOR_STATE", state: "speaking" });
          startAmplitudeLoop();
        };

        audio.onended = () => {
          setIsPlaying(false);
          dispatch({ type: "SET_ANCHOR_STATE", state: "idle" });
          stopAmplitudeLoop();
          resolve(audio.duration * 1000 || 45_000);
        };

        audio.onerror = () => {
          setIsPlaying(false);
          dispatch({ type: "SET_ANCHOR_STATE", state: "idle" });
          stopAmplitudeLoop();
          resolve(45_000); // fallback duration
        };

        void ctx
          .resume()
          .then(() => audio.play())
          .catch(() => {
            dispatch({ type: "SET_AUDIO_BLOCKED", blocked: true });
            dispatch({ type: "SET_MUTED", isMuted: true });
            resolve(10_000);
          });
      });
    },
    [getAudioCtx, dispatch, startAmplitudeLoop, stopAmplitudeLoop]
  );

  /** Fallback: Web Speech API */
  const playWebSpeech = useCallback(
    (text: string, language: BroadcastLanguage): Promise<number> => {
      return new Promise((resolve) => {
        if (!("speechSynthesis" in window)) {
          resolve(10_000);
          return;
        }
        if (utteranceRef.current) {
          window.speechSynthesis.cancel();
        }

        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = language === "hi" ? "hi-IN" : "en-IN";
        utter.rate = 0.9;
        utter.pitch = 1.05;

        // Pick a female voice if available
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(
          (v) =>
            v.lang.startsWith(language === "hi" ? "hi" : "en") &&
            (v.name.toLowerCase().includes("female") ||
              v.name.toLowerCase().includes("woman") ||
              v.name.toLowerCase().includes("priya") ||
              v.name.toLowerCase().includes("heera"))
        );
        if (femaleVoice) utter.voice = femaleVoice;

        const startedAt = Date.now();
        let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

        const cleanup = () => {
          if (fallbackTimer) clearTimeout(fallbackTimer);
          stopAmplitudeLoop();
          setIsPlaying(false);
          dispatch({ type: "SET_ANCHOR_STATE", state: "idle" });
        };

        // Safety fallback timer: auto-resolve after max 15 seconds if browser speech synthesis hangs
        const maxDuration = Math.min(15_000, Math.max(8_000, Math.round(text.length * 60)));
        fallbackTimer = setTimeout(() => {
          cleanup();
          resolve(maxDuration);
        }, maxDuration + 1000);

        utter.onstart = () => {
          setIsPlaying(true);
          dispatch({ type: "SET_ANCHOR_STATE", state: "speaking" });
          let tick = 0;
          const fakeLoop = () => {
            tick += 0.15;
            const amp = (Math.sin(tick) * 0.3 + 0.4) * 0.8;
            dispatch({ type: "SET_AMPLITUDE", amplitude: amp });
            if (window.speechSynthesis.speaking) {
              animFrameRef.current = requestAnimationFrame(fakeLoop);
            }
          };
          animFrameRef.current = requestAnimationFrame(fakeLoop);
        };

        utter.onend = () => {
          cleanup();
          resolve(Date.now() - startedAt);
        };

        utter.onerror = (e) => {
          cleanup();
          if (e.error === "not-allowed") {
            dispatch({ type: "SET_AUDIO_BLOCKED", blocked: true });
            dispatch({ type: "SET_MUTED", isMuted: true });
          }
          resolve(maxDuration);
        };

        utteranceRef.current = utter;
        try {
          window.speechSynthesis.speak(utter);
        } catch {
          cleanup();
          resolve(maxDuration);
        }
      });
    },
    [dispatch, stopAmplitudeLoop]
  );

  const stop = useCallback(() => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    stopAmplitudeLoop();
    setIsPlaying(false);
    dispatch({ type: "SET_ANCHOR_STATE", state: "idle" });
  }, [dispatch, stopAmplitudeLoop]);

  /**
   * Speak a script. If muted, runs a silent visual timer.
   * If unmuted, tries server TTS first, falls back to Web Speech.
   * Returns playback duration in ms.
   */
  const speak = useCallback(
    async (params: {
      script: string;
      language: BroadcastLanguage;
      ttsPath?: string;
    }): Promise<number> => {
      stop();
      dispatch({ type: "SET_AUDIO_READY", ready: false });

      if (state.isMuted) {
        // Visual-only silent timer (reading duration ~10s)
        const silentDuration = Math.min(14_000, Math.max(9_000, Math.round(params.script.length * 60)));
        return new Promise<number>((resolve) => {
          dispatch({ type: "SET_ANCHOR_STATE", state: "speaking" });
          setTimeout(() => {
            dispatch({ type: "SET_ANCHOR_STATE", state: "idle" });
            resolve(silentDuration);
          }, silentDuration);
        });
      }

      // Try server TTS
      if (params.ttsPath) {
        try {
          const durationMs = await playServerTts(params.ttsPath);
          return durationMs;
        } catch {
          // Fall through to Web Speech
        }
      }

      // Web Speech fallback
      return playWebSpeech(params.script, params.language);
    },
    [dispatch, playServerTts, playWebSpeech, state.isMuted, stop]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      if (audioCtxRef.current) {
        void audioCtxRef.current.close();
      }
    };
  }, [stop]);

  return { speak, stop, isPlaying };
}
