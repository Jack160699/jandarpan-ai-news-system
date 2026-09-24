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
 * Module-scoped reference to active SpeechSynthesisUtterance to prevent
 * premature garbage collection in Chromium browsers.
 */
let globalActiveUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Cache for browser speech voices to prevent repeated lookup or race conditions.
 */
let cachedVoices: SpeechSynthesisVoice[] = [];

/**
 * Ensures voices are loaded asynchronously in Chrome/Edge/Safari.
 */
async function loadBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return [];
  }
  if (cachedVoices.length > 0) {
    return cachedVoices;
  }
  const current = window.speechSynthesis.getVoices();
  if (current.length > 0) {
    cachedVoices = current;
    return cachedVoices;
  }

  return new Promise((resolve) => {
    let settled = false;
    const onVoicesChanged = () => {
      if (!settled) {
        settled = true;
        cachedVoices = window.speechSynthesis.getVoices();
        window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
        resolve(cachedVoices);
      }
    };
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    setTimeout(() => {
      if (!settled) {
        settled = true;
        cachedVoices = window.speechSynthesis.getVoices();
        window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
        resolve(cachedVoices);
      }
    }, 300);
  });
}

/**
 * Select the most natural Indian television news anchor voice.
 */
async function selectAnchorVoice(language: BroadcastLanguage): Promise<SpeechSynthesisVoice | null> {
  const voices = await loadBrowserVoices();
  if (!voices || voices.length === 0) return null;

  if (language === "hi") {
    // 1. Google हिन्दी (Chrome / Android)
    // 2. Microsoft Swara / Heera / Kalpana (Edge / Windows)
    // 3. Any hi-IN voice
    return (
      voices.find((v) => (v.lang === "hi-IN" || v.lang.startsWith("hi")) && (v.name.includes("Google") || v.name.includes("Natural"))) ||
      voices.find((v) => (v.lang === "hi-IN" || v.lang.startsWith("hi")) && (v.name.includes("Swara") || v.name.includes("Heera") || v.name.includes("Kalpana"))) ||
      voices.find((v) => v.lang === "hi-IN" && v.name.toLowerCase().includes("female")) ||
      voices.find((v) => v.lang === "hi-IN") ||
      voices.find((v) => v.lang.startsWith("hi")) ||
      null
    );
  } else {
    // 1. Indian English female (Google / Microsoft Neerja / Kalpana)
    // 2. en-IN voices
    // 3. Natural en female
    return (
      voices.find((v) => (v.lang === "en-IN" || v.name.toLowerCase().includes("india")) && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Neerja") || v.name.includes("Kalpana"))) ||
      voices.find((v) => (v.lang === "en-IN" || v.name.toLowerCase().includes("india")) && v.name.toLowerCase().includes("female")) ||
      voices.find((v) => v.lang === "en-IN" || v.name.toLowerCase().includes("india")) ||
      voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.toLowerCase().includes("female"))) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      null
    );
  }
}

/**
 * Format raw script into natural television news spoken delivery.
 * Paces sentences with proper punctuation, ranking transitions, and news cadence.
 */
export function formatAnchorSpokenScript(
  text: string,
  params: {
    isIntro?: boolean;
    countdownRank?: number;
    isBreaking?: boolean;
    language: BroadcastLanguage;
  }
): string {
  const { isIntro, countdownRank, isBreaking, language } = params;
  if (isIntro) return text;

  if (language === "hi") {
    let prefix = "";
    if (isBreaking) {
      prefix = "ब्रेकिंग न्यूज़। ";
    } else if (countdownRank && countdownRank > 0) {
      prefix = `नंबर ${countdownRank}। `;
    }
    const cleaned = text
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/।+/g, "।")
      .trim();
    return `${prefix}${cleaned}`;
  } else {
    let prefix = "";
    if (isBreaking) {
      prefix = "Breaking News. ";
    } else if (countdownRank && countdownRank > 0) {
      prefix = `Story number ${countdownRank}. `;
    }
    const cleaned = text
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\.+/g, ".")
      .trim();
    return `${prefix}${cleaned}`;
  }
}

/**
 * Manages zero-cost, browser-native television anchor voice playback,
 * broadcast sound stings, lip-sync amplitude extraction, and continuous queue progression.
 * Features stale callback protection and automatic voice error recovery.
 */
export function useAnchorVoice() {
  const { state, dispatch } = useBroadcast();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTokenRef = useRef<number>(0);
  const retryCountRef = useRef<Record<number, number>>({});
  const isMutedRef = useRef(state.isMuted);
  isMutedRef.current = state.isMuted;
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize or resume Web Audio context for broadcast stings
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

  const stopAmplitudeLoop = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    dispatch({ type: "SET_AMPLITUDE", amplitude: 0 });
  }, [dispatch]);

  const stopWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearInterval(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    globalActiveUtterance = null;
    stopWatchdog();
    stopAmplitudeLoop();
    setIsPlaying(false);
    dispatch({ type: "SET_ANCHOR_STATE", state: "idle" });
  }, [dispatch, stopAmplitudeLoop, stopWatchdog]);

  /**
   * Speak anchor script via the Web Speech API with natural broadcast cadence.
   * Protects against stale callbacks with segmentToken matching.
   */
  const speak = useCallback(
    async (params: {
      script: string;
      language: BroadcastLanguage;
      ttsPath?: string;
      isIntro?: boolean;
      countdownRank?: number;
      isBreaking?: boolean;
      segmentToken: number;
    }): Promise<number> => {
      // Set active token
      activeTokenRef.current = params.segmentToken;

      // Cancel previous speech before starting new story
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      stopWatchdog();
      stopAmplitudeLoop();

      dispatch({ type: "SET_AUDIO_READY", ready: true });

      const spokenText = formatAnchorSpokenScript(params.script, {
        isIntro: params.isIntro,
        countdownRank: params.countdownRank,
        isBreaking: params.isBreaking,
        language: params.language,
      });

      // Target speech duration: ~10-25 seconds depending on text length
      const targetDurationMs = Math.min(
        25_000,
        Math.max(9_000, Math.round(spokenText.length * 72))
      );

      // If muted, run silent visual timer so newsroom continues advancing smoothly
      if (isMutedRef.current) {
        return new Promise<number>((resolve) => {
          dispatch({ type: "SET_ANCHOR_STATE", state: "speaking" });
          let tick = 0;
          let resolved = false;
          const fakeLoop = () => {
            if (resolved || activeTokenRef.current !== params.segmentToken) {
              // Token changed — stop the loop but don't double-resolve
              if (!resolved) {
                resolved = true;
                stopAmplitudeLoop();
                dispatch({ type: "SET_ANCHOR_STATE", state: "idle" });
                resolve(0);
              }
              return;
            }
            tick += 0.16;
            const amp = (Math.sin(tick) * 0.3 + 0.4) * 0.7;
            dispatch({ type: "SET_AMPLITUDE", amplitude: amp });
            animFrameRef.current = requestAnimationFrame(fakeLoop);
          };
          animFrameRef.current = requestAnimationFrame(fakeLoop);

          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              stopAmplitudeLoop();
              dispatch({ type: "SET_ANCHOR_STATE", state: "idle" });
              resolve(targetDurationMs);
            }
          }, targetDurationMs);
        });
      }

      // Play appropriate supporting broadcast news sound sting
      const ctx = getAudioCtx();
      if (ctx) {
        try {
          if (params.isIntro) {
            playIntroSting(ctx);
            await new Promise((r) => setTimeout(r, 550));
          } else if (params.isBreaking) {
            playBreakingSting(ctx);
            await new Promise((r) => setTimeout(r, 450));
          } else if (params.countdownRank) {
            playNumberSting(params.countdownRank, ctx);
            await new Promise((r) => setTimeout(r, 320));
          } else {
            playTransitionSting(ctx);
            await new Promise((r) => setTimeout(r, 280));
          }
        } catch {
          // Audio sting play blocked or failed; proceed with voice
        }
      }

      // If token changed while playing sting, abort cleanly
      if (activeTokenRef.current !== params.segmentToken) {
        return targetDurationMs;
      }

      // Execute SpeechSynthesis
      return new Promise<number>(async (resolve) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
          resolve(targetDurationMs);
          return;
        }

        const utter = new SpeechSynthesisUtterance(spokenText);
        globalActiveUtterance = utter;

        utter.lang = params.language === "hi" ? "hi-IN" : "en-IN";
        utter.rate = params.language === "hi" ? 0.94 : 0.96;
        utter.pitch = 1.0;

        const voice = await selectAnchorVoice(params.language);
        if (voice) {
          utter.voice = voice;
        }

        const startTime = Date.now();
        let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

        const finish = (finalDuration: number) => {
          if (params.segmentToken !== activeTokenRef.current) return;
          if (fallbackTimer) clearTimeout(fallbackTimer);
          stopWatchdog();
          stopAmplitudeLoop();
          setIsPlaying(false);
          dispatch({ type: "SET_ANCHOR_STATE", state: "idle" });
          globalActiveUtterance = null;
          resolve(finalDuration);
        };

        // Safety watchdog: Chromium speech synthesis stalls after 14s if resume() is not nudged
        watchdogRef.current = setInterval(() => {
          if (window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 3500);

        // Safety fallback timer if onend fails to fire
        fallbackTimer = setTimeout(() => {
          finish(targetDurationMs);
        }, targetDurationMs + 2000);

        utter.onstart = () => {
          if (params.segmentToken !== activeTokenRef.current) return;
          setIsPlaying(true);
          dispatch({ type: "SET_ANCHOR_STATE", state: "speaking" });

          let tick = 0;
          const animLoop = () => {
            if (params.segmentToken !== activeTokenRef.current) return;
            tick += 0.2;
            const amp = Math.max(0.1, (Math.sin(tick) * 0.35 + 0.45) * 0.85);
            dispatch({ type: "SET_AMPLITUDE", amplitude: amp });
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
              animFrameRef.current = requestAnimationFrame(animLoop);
            }
          };
          animFrameRef.current = requestAnimationFrame(animLoop);
        };

        utter.onend = () => {
          if (params.segmentToken !== activeTokenRef.current) return;
          const elapsed = Date.now() - startTime;
          finish(Math.max(elapsed, 7000));
        };

        utter.onerror = (e) => {
          if (params.segmentToken !== activeTokenRef.current) return;
          if (e.error === "not-allowed") {
            dispatch({ type: "SET_AUDIO_BLOCKED", blocked: true });
            dispatch({ type: "SET_MUTED", isMuted: true });
            finish(targetDurationMs);
            return;
          }

          // Voice Error Recovery (Requirement 20): retry once after 500ms
          const retries = retryCountRef.current[params.segmentToken] || 0;
          if (retries === 0 && e.error !== "canceled") {
            retryCountRef.current[params.segmentToken] = 1;
            setTimeout(() => {
              if (params.segmentToken === activeTokenRef.current) {
                try {
                  window.speechSynthesis.speak(utter);
                } catch {
                  finish(targetDurationMs);
                }
              }
            }, 500);
            return;
          }

          // Second failure: advance smoothly without freezing visual broadcast
          finish(targetDurationMs);
        };

        try {
          window.speechSynthesis.speak(utter);
        } catch {
          finish(targetDurationMs);
        }
      });
    },
    [dispatch, getAudioCtx, stopAmplitudeLoop, stopWatchdog]
  );

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
