"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBroadcast } from "./BroadcastContext";
import type { BroadcastLanguage } from "./types";
import {
  playIntroSting,
  playNumberSting,
  playTransitionSting,
  playBreakingSting,
} from "./audioStings";

/**
 * Manages TTS audio playback, television audio stings, and lip-sync amplitude extraction.
 * Integrates Web Audio API stings and falls back gracefully to Web Speech API.
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
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current.state === "suspended") {
      void audioCtxRef.current.resume().catch(() => {});
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

  /** Play via server TTS (OpenAI / Edge TTS) */
  const playServerTts = useCallback(
    async (ttsUrl: string): Promise<number> => {
      return new Promise((resolve, reject) => {
        const { ctx, analyser } = getAudioCtx();

        if (audioElRef.current) {
          audioElRef.current.pause();
        }

        const audio = new Audio(ttsUrl);
        audio.crossOrigin = "anonymous";
        audioElRef.current = audio;

        try {
          const source = ctx.createMediaElementSource(audio);
          source.connect(analyser);
          sourceRef.current = source;
        } catch {
          // MediaElementSource might already be connected
        }

        audio.onplay = () => {
          setIsPlaying(true);
          dispatch({ type: "SET_ANCHOR_STATE", state: "speaking" });
          startAmplitudeLoop();
        };

        audio.onended = () => {
          setIsPlaying(false);
          dispatch({ type: "SET_ANCHOR_STATE", state: "idle" });
          stopAmplitudeLoop();
          resolve(audio.duration * 1000 || 12_000);
        };

        audio.onerror = () => {
          setIsPlaying(false);
          dispatch({ type: "SET_ANCHOR_STATE", state: "idle" });
          stopAmplitudeLoop();
          reject(new Error("Audio load error"));
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

  /** Natural Indian news presentation via Web Speech API */
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
        // Natural Indian news presentation speed and pitch
        utter.rate = 0.95;
        utter.pitch = 1.0;

        // Select the most natural Indian broadcast voice
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = null;

        if (language === "hi") {
          // Priority: Google हिन्दी -> Swara -> Hindi Female -> Any Hindi
          selectedVoice =
            voices.find((v) => v.lang === "hi-IN" && (v.name.includes("Google") || v.name.includes("Natural"))) ||
            voices.find((v) => v.lang === "hi-IN" && (v.name.toLowerCase().includes("female") || v.name.includes("Swara") || v.name.includes("Heera"))) ||
            voices.find((v) => v.lang.startsWith("hi")) ||
            null;
        } else {
          // Priority: Indian English female -> Natural English -> en-IN
          selectedVoice =
            voices.find((v) => v.lang === "en-IN" && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Kalpana") || v.name.includes("Neerja"))) ||
            voices.find((v) => v.lang === "en-IN" && v.name.toLowerCase().includes("female")) ||
            voices.find((v) => v.lang === "en-IN") ||
            voices.find((v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("female")) ||
            null;
        }

        if (selectedVoice) {
          utter.voice = selectedVoice;
        }

        const startedAt = Date.now();
        let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

        const cleanup = () => {
          if (fallbackTimer) clearTimeout(fallbackTimer);
          stopAmplitudeLoop();
          setIsPlaying(false);
          dispatch({ type: "SET_ANCHOR_STATE", state: "idle" });
        };

        // Safety fallback timer: auto-resolve after max 18 seconds if speech synthesis stalls
        const maxDuration = Math.min(18_000, Math.max(7_000, Math.round(text.length * 62)));
        fallbackTimer = setTimeout(() => {
          cleanup();
          resolve(maxDuration);
        }, maxDuration + 1000);

        utter.onstart = () => {
          setIsPlaying(true);
          dispatch({ type: "SET_ANCHOR_STATE", state: "speaking" });
          let tick = 0;
          const fakeLoop = () => {
            tick += 0.18;
            const amp = (Math.sin(tick) * 0.35 + 0.45) * 0.75;
            dispatch({ type: "SET_AMPLITUDE", amplitude: amp });
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
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
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    stopAmplitudeLoop();
    setIsPlaying(false);
    dispatch({ type: "SET_ANCHOR_STATE", state: "idle" });
  }, [dispatch, stopAmplitudeLoop]);

  /**
   * Speak a story script with appropriate broadcast audio stings.
   * If muted, runs a natural reading timer.
   * If unmuted, plays supporting news sting, then presents story script.
   */
  const speak = useCallback(
    async (params: {
      script: string;
      language: BroadcastLanguage;
      ttsPath?: string;
      isIntro?: boolean;
      countdownRank?: number;
      isBreaking?: boolean;
    }): Promise<number> => {
      stop();
      dispatch({ type: "SET_AUDIO_READY", ready: false });

      if (state.isMuted) {
        // Visual-only silent timer (reading duration ~10-12s)
        const silentDuration = Math.min(14_000, Math.max(8_000, Math.round(params.script.length * 55)));
        return new Promise<number>((resolve) => {
          dispatch({ type: "SET_ANCHOR_STATE", state: "speaking" });
          setTimeout(() => {
            dispatch({ type: "SET_ANCHOR_STATE", state: "idle" });
            resolve(silentDuration);
          }, silentDuration);
        });
      }

      // Play appropriate supporting broadcast news sting
      const { ctx } = getAudioCtx();
      if (params.isIntro) {
        playIntroSting(ctx);
        // Short pause for intro fanfare
        await new Promise((r) => setTimeout(r, 600));
      } else if (params.isBreaking) {
        playBreakingSting(ctx);
        await new Promise((r) => setTimeout(r, 500));
      } else if (params.countdownRank) {
        playNumberSting(params.countdownRank, ctx);
        await new Promise((r) => setTimeout(r, 350));
      } else {
        playTransitionSting(ctx);
        await new Promise((r) => setTimeout(r, 300));
      }

      // 1. Try server TTS if ttsPath exists or server endpoint is available
      const ttsUrl =
        params.ttsPath ||
        `/api/broadcast/tts?text=${encodeURIComponent(params.script.slice(0, 300))}&lang=${params.language}`;
      try {
        const durationMs = await playServerTts(ttsUrl);
        return durationMs;
      } catch {
        // 2. Fallback to Web Speech API
      }

      return playWebSpeech(params.script, params.language);
    },
    [dispatch, getAudioCtx, playServerTts, playWebSpeech, state.isMuted, stop]
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
