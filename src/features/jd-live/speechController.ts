/**
 * Jan Darpan Speech Controller Singleton
 *
 * Deterministic source of truth for browser SpeechSynthesis.
 * Guarantees:
 * 1. Immediate cancellation upon PAUSE or MUTE (speechSynthesis.cancel()).
 * 2. Invalidation of all pending/stale callbacks and retries.
 * 3. Prevention of duplicate utterances or speaking after pause.
 * 4. Safe watchdog recovery for the Chromium 15-second speech freeze bug,
 *    strictly disabled when paused or muted.
 * 5. Exactly ONE active speech lifecycle.
 */

import type { BroadcastLanguage } from "./types";

export type SpeechControllerCallbacks = {
  onStart?: () => void;
  onEnd?: (durationMs: number) => void;
  onAmplitude?: (amplitude: number) => void;
  onBlocked?: () => void;
  onError?: (err: string) => void;
};

let cachedVoices: SpeechSynthesisVoice[] = [];

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
    }, 250);
  });
}

async function selectAnchorVoice(language: BroadcastLanguage): Promise<SpeechSynthesisVoice | null> {
  const voices = await loadBrowserVoices();
  if (!voices || voices.length === 0) return null;

  if (language === "hi") {
    return (
      voices.find(
        (v) =>
          (v.lang === "hi-IN" || v.lang.startsWith("hi")) &&
          (v.name.includes("Google") || v.name.includes("Natural") || v.name.toLowerCase().includes("female"))
      ) ||
      voices.find(
        (v) =>
          (v.lang === "hi-IN" || v.lang.startsWith("hi")) &&
          (v.name.includes("Swara") || v.name.includes("Heera") || v.name.includes("Kalpana"))
      ) ||
      voices.find((v) => v.lang === "hi-IN") ||
      voices.find((v) => v.lang.startsWith("hi")) ||
      null
    );
  } else {
    return (
      voices.find(
        (v) =>
          (v.lang === "en-IN" || v.name.toLowerCase().includes("india")) &&
          (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Neerja"))
      ) ||
      voices.find((v) => v.lang === "en-IN" || v.name.toLowerCase().includes("india")) ||
      voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Google") || v.name.includes("Natural") || v.name.toLowerCase().includes("female"))
      ) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      null
    );
  }
}

class AnchorSpeechController {
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private activeToken: number = 0;
  private isPaused: boolean = false;
  private isMuted: boolean = false;
  private tokenProgress: Record<number, { charIndex: number; startTime: number; totalEstimatedMs: number }> = {};
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private silentTimer: ReturnType<typeof setTimeout> | null = null;
  private animFrameId: number | null = null;
  private callbacks: SpeechControllerCallbacks = {};

  constructor() {
    if (typeof window !== "undefined") {
      // Pre-warm voices non-blockingly
      void loadBrowserVoices();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.cancelSpeechOnly();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Immediately stops browser SpeechSynthesis and clears internal animation loops.
   */
  public cancelSpeechOnly() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.activeUtterance = null;
    this.stopWatchdog();
    this.stopRetry();
    this.stopAnimation();
    this.stopSilentTimer();
    this.callbacks.onAmplitude?.(0);
  }

  /**
   * PAUSE: Freezes speech immediately, marks paused, records current progress, and cancels utterances.
   */
  public pause() {
    this.isPaused = true;
    if (this.activeToken && this.tokenProgress[this.activeToken]) {
      const prog = this.tokenProgress[this.activeToken];
      const elapsed = Date.now() - prog.startTime;
      if (prog.totalEstimatedMs > 0 && this.activeUtterance?.text) {
        const estimatedChar = Math.floor(
          (elapsed / prog.totalEstimatedMs) * this.activeUtterance.text.length
        );
        if (estimatedChar > prog.charIndex) {
          prog.charIndex = estimatedChar;
        }
      }
    }
    this.cancelSpeechOnly();
  }

  /**
   * RESUME: Unmarks paused.
   */
  public resume() {
    this.isPaused = false;
  }

  /**
   * STOP: Complete shutdown of active speech and resets callbacks and progress.
   */
  public stop() {
    this.cancelSpeechOnly();
    this.activeToken = 0;
    this.tokenProgress = {};
  }

  private stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private stopRetry() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private stopSilentTimer() {
    if (this.silentTimer) {
      clearTimeout(this.silentTimer);
      this.silentTimer = null;
    }
  }

  private stopAnimation() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /**
   * Speaks a story narration cleanly.
   * If muted: runs a silent timer with simulated amplitude, advancing naturally.
   * If paused: does nothing.
   * If resuming same token: continues from the recorded position.
   */
  public async speakStory(
    text: string,
    params: {
      language: BroadcastLanguage;
      token: number;
      callbacks: SpeechControllerCallbacks;
    }
  ): Promise<void> {
    const { language, token, callbacks } = params;

    // Invalidate previous speech
    this.cancelSpeechOnly();
    this.activeToken = token;
    this.callbacks = callbacks;

    if (this.isPaused) {
      return;
    }

    const cleanText = text
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const isAccelerated =
      typeof window !== "undefined" &&
      !!(window as unknown as { __JD_TEST_ACCELERATED__?: boolean }).__JD_TEST_ACCELERATED__;

    const fullEstimatedDurationMs = isAccelerated
      ? 2000
      : Math.min(26000, Math.max(8000, Math.round(cleanText.length * 72)));

    // Check if we are resuming an already-in-progress story
    const existingProgress = this.tokenProgress[token];
    let textToSpeak = cleanText;
    let estimatedDurationMs = fullEstimatedDurationMs;

    if (existingProgress && existingProgress.charIndex > 0 && existingProgress.charIndex < cleanText.length - 12) {
      // Find clean word boundary
      const spaceIdx = cleanText.indexOf(" ", existingProgress.charIndex);
      if (spaceIdx > 0 && spaceIdx < cleanText.length - 10) {
        textToSpeak = cleanText.slice(spaceIdx).trim();
        const ratio = textToSpeak.length / Math.max(1, cleanText.length);
        estimatedDurationMs = Math.max(3000, Math.round(fullEstimatedDurationMs * ratio));
      }
    }

    const startTime = Date.now();
    this.tokenProgress[token] = {
      charIndex: existingProgress ? existingProgress.charIndex : 0,
      startTime,
      totalEstimatedMs: estimatedDurationMs,
    };

    const settleEnd = (durationMs: number) => {
      if (this.activeToken !== token) return;
      delete this.tokenProgress[token];
      this.stopWatchdog();
      this.stopAnimation();
      this.activeUtterance = null;
      callbacks.onAmplitude?.(0);
      callbacks.onEnd?.(durationMs);
    };

    // ─── MUTED MODE ────────────────────────────────────────────────────────
    if (this.isMuted) {
      callbacks.onStart?.();

      let tick = 0;
      const fakeLipSync = () => {
        if (this.activeToken !== token || this.isPaused || !this.isMuted) {
          this.stopAnimation();
          return;
        }
        tick += 0.16;
        const amp = (Math.sin(tick) * 0.3 + 0.4) * 0.65;
        callbacks.onAmplitude?.(amp);
        this.animFrameId = requestAnimationFrame(fakeLipSync);
      };
      this.animFrameId = requestAnimationFrame(fakeLipSync);

      this.silentTimer = setTimeout(() => {
        if (this.activeToken === token && !this.isPaused) {
          this.stopAnimation();
          callbacks.onAmplitude?.(0);
          settleEnd(estimatedDurationMs);
        }
      }, estimatedDurationMs);

      return;
    }

    // ─── UNMUTED AUDIO MODE ────────────────────────────────────────────────
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      callbacks.onStart?.();
      this.silentTimer = setTimeout(() => {
        settleEnd(estimatedDurationMs);
      }, estimatedDurationMs);
      return;
    }

    const utter = new SpeechSynthesisUtterance(textToSpeak);
    this.activeUtterance = utter;

    utter.lang = language === "hi" ? "hi-IN" : "en-IN";
    utter.rate = language === "hi" ? 0.94 : 0.96;
    utter.pitch = 1.0;

    const voice = await selectAnchorVoice(language);
    if (voice && this.activeToken === token) {
      utter.voice = voice;
    }

    utter.onboundary = (e: SpeechSynthesisEvent) => {
      if (this.activeToken === token && e.charIndex !== undefined && e.charIndex > 0) {
        const baseChar = existingProgress?.charIndex || 0;
        if (this.tokenProgress[token]) {
          this.tokenProgress[token].charIndex = baseChar + e.charIndex;
        }
      }
    };

    utter.onstart = () => {
      if (this.activeToken !== token || this.isPaused) {
        this.cancelSpeechOnly();
        return;
      }
      callbacks.onStart?.();

      let tick = 0;
      const lipSync = () => {
        if (this.activeToken !== token || this.isPaused || !this.activeUtterance) {
          this.stopAnimation();
          return;
        }
        tick += 0.2;
        const amp = Math.max(0.1, (Math.sin(tick) * 0.35 + 0.45) * 0.85);
        callbacks.onAmplitude?.(amp);
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
          this.animFrameId = requestAnimationFrame(lipSync);
        }
      };
      this.animFrameId = requestAnimationFrame(lipSync);
    };

    utter.onend = () => {
      const elapsed = Date.now() - startTime;
      settleEnd(elapsed);
    };

    utter.onerror = (e) => {
      // Abort silently if intentional cancel/interrupt or paused
      if (
        this.isPaused ||
        this.activeToken !== token ||
        e.error === "canceled" ||
        e.error === "interrupted"
      ) {
        return;
      }

      if (e.error === "not-allowed") {
        callbacks.onBlocked?.();
        this.isMuted = true;
        settleEnd(estimatedDurationMs);
        return;
      }

      // If speech synthesis encountered a runtime error, advance cleanly without locking TV
      settleEnd(estimatedDurationMs);
    };

    // Chromium 15s freeze watchdog: ONLY nudges resume when actively speaking & NOT paused/muted
    this.watchdogTimer = setInterval(() => {
      if (
        !this.isPaused &&
        !this.isMuted &&
        this.activeToken === token &&
        typeof window !== "undefined" &&
        window.speechSynthesis
      ) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else if (Date.now() - startTime > 14000 && window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }
    }, 4000);

    // Fallback timer if onend fails to fire
    this.silentTimer = setTimeout(() => {
      settleEnd(estimatedDurationMs);
    }, estimatedDurationMs + (isAccelerated ? 500 : 2500));

    try {
      window.speechSynthesis.speak(utter);
    } catch {
      settleEnd(estimatedDurationMs);
    }
  }
}

export const speechController = new AnchorSpeechController();
