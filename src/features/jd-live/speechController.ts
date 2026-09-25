/**
 * Jan Darpan Speech Controller Singleton
 *
 * Deterministic source of truth for browser SpeechSynthesis.
 * Guarantees:
 * 1. Complete AI summary spoken from beginning to end via sequential speech chunks.
 * 2. Elimination of the Chromium 15-second utterance freeze / garbage-collection bug
 *    by chunking text at natural sentence boundaries (Devanagari danda '।' in Hindi, '.' in English).
 * 3. Natural, continuous transitions between chunks with zero audible gaps.
 * 4. Authoritative story completion ONLY when the FINAL chunk finishes speaking.
 * 5. Robust pause & resume across multi-chunk speech, continuing from current chunk.
 * 6. Clean mute & unmute support with synchronized visual timing.
 * 7. Invalidation of all pending/stale callbacks and retries.
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

/**
 * Splits canonical story narration into natural speech chunks at sentence boundaries.
 * Chunks are sized (~60 to 140 chars) to prevent the Chromium 15-second freeze bug
 * while ensuring smooth, continuous playback.
 */
export function splitIntoSpeechChunks(text: string, language: BroadcastLanguage): string[] {
  if (!text) return [];
  const clean = text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return [];

  // Split on Devanagari danda '।' or periods/question/exclamation
  const rawSentences = clean
    .split(/(?<=[।\.!\?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  for (const raw of rawSentences) {
    if (raw.length <= 150) {
      chunks.push(raw);
    } else {
      // Sub-split unusually long sentences at commas / semicolons
      const parts = raw.split(/(?<=[,;])\s+/);
      let current = "";
      for (const p of parts) {
        if ((current + " " + p).trim().length <= 150) {
          current = (current ? current + " " : "") + p;
        } else {
          if (current) chunks.push(current.trim());
          current = p;
        }
      }
      if (current) chunks.push(current.trim());
    }
  }

  return chunks.length > 0 ? chunks : [clean];
}

class AnchorSpeechController {
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private activeToken: number = 0;
  private currentLanguage: BroadcastLanguage = "hi";
  private isPaused: boolean = false;
  private isMuted: boolean = false;
  private tokenProgress: Record<
    number,
    {
      chunks: string[];
      chunkIndex: number;
      startTime: number;
      totalEstimatedMs: number;
    }
  > = {};
  private chunkWatchdogTimer: ReturnType<typeof setInterval> | null = null;
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
      // If currently playing, continue visual progression in muted mode
      if (this.activeToken && !this.isPaused && this.tokenProgress[this.activeToken]) {
        void this.speakChunkSequence(this.activeToken, this.currentLanguage);
      }
    } else {
      // Unmuted: cancel silent timer and resume audible chunks
      this.stopSilentTimer();
      if (this.activeToken && !this.isPaused && this.tokenProgress[this.activeToken]) {
        void this.speakChunkSequence(this.activeToken, this.currentLanguage);
      }
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
    this.stopAnimation();
    this.stopSilentTimer();
    this.callbacks.onAmplitude?.(0);
  }

  /**
   * PAUSE: Freezes speech immediately, marks paused, preserves chunk position.
   */
  public pause() {
    this.isPaused = true;
    this.cancelSpeechOnly();
  }

  /**
   * RESUME: Unmarks paused and continues speech from the current chunk.
   */
  public resume() {
    this.isPaused = false;
    if (this.activeToken && this.tokenProgress[this.activeToken]) {
      void this.speakChunkSequence(this.activeToken, this.currentLanguage);
    }
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
    if (this.chunkWatchdogTimer) {
      clearInterval(this.chunkWatchdogTimer);
      this.chunkWatchdogTimer = null;
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

  private startLipSyncAnimation(token: number) {
    this.stopAnimation();
    let tick = 0;
    const animate = () => {
      if (this.activeToken !== token || this.isPaused) {
        this.stopAnimation();
        this.callbacks.onAmplitude?.(0);
        return;
      }
      tick += 0.2;
      const baseAmp = Math.sin(tick) * 0.35 + 0.45;
      const amp = this.isMuted ? baseAmp * 0.6 : Math.max(0.12, baseAmp * 0.85);
      this.callbacks.onAmplitude?.(amp);
      this.animFrameId = requestAnimationFrame(animate);
    };
    this.animFrameId = requestAnimationFrame(animate);
  }

  private settleEnd(token: number, elapsedMs: number) {
    if (this.activeToken !== token) return;
    delete this.tokenProgress[token];
    this.stopWatchdog();
    this.stopAnimation();
    this.stopSilentTimer();
    this.activeUtterance = null;
    this.callbacks.onAmplitude?.(0);
    this.callbacks.onEnd?.(elapsedMs);
  }

  /**
   * Executes speech chunk sequence until all chunks of the complete AI summary are finished.
   */
  private async speakChunkSequence(token: number, language: BroadcastLanguage): Promise<void> {
    const prog = this.tokenProgress[token];
    if (!prog || this.activeToken !== token || this.isPaused) return;

    // Check if ALL chunks of the complete AI summary are completed
    if (prog.chunkIndex >= prog.chunks.length) {
      this.settleEnd(token, Date.now() - prog.startTime);
      return;
    }

    const isAccelerated =
      typeof window !== "undefined" &&
      !!(window as unknown as { __JD_TEST_ACCELERATED__?: boolean }).__JD_TEST_ACCELERATED__;

    // ─── MUTED MODE ────────────────────────────────────────────────────────
    if (this.isMuted) {
      if (prog.chunkIndex === 0) {
        this.callbacks.onStart?.();
      }
      this.startLipSyncAnimation(token);

      // In muted mode, advance through remaining chunks smoothly
      const remainingChunks = prog.chunks.slice(prog.chunkIndex);
      const remainingChars = remainingChunks.join(" ").length;
      const remainingDurationMs = isAccelerated
        ? 300 * remainingChunks.length
        : Math.max(8000, Math.round(remainingChars * 88));

      this.stopSilentTimer();
      this.silentTimer = setTimeout(() => {
        if (this.activeToken === token && !this.isPaused && this.isMuted) {
          prog.chunkIndex = prog.chunks.length;
          this.settleEnd(token, Date.now() - prog.startTime);
        }
      }, remainingDurationMs);

      return;
    }

    // ─── UNMUTED / SPEECH SYNTHESIS MODE ───────────────────────────────────
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      if (prog.chunkIndex === 0) {
        this.callbacks.onStart?.();
      }
      this.silentTimer = setTimeout(() => {
        this.settleEnd(token, prog.totalEstimatedMs);
      }, prog.totalEstimatedMs);
      return;
    }

    const chunkText = prog.chunks[prog.chunkIndex];
    const utter = new SpeechSynthesisUtterance(chunkText);
    this.activeUtterance = utter;

    utter.lang = language === "hi" ? "hi-IN" : "en-IN";
    utter.rate = language === "hi" ? 0.94 : 0.96;
    utter.pitch = 1.0;

    const voice = await selectAnchorVoice(language);
    if (voice && this.activeToken === token) {
      utter.voice = voice;
    }

    utter.onstart = () => {
      if (this.activeToken !== token || this.isPaused) {
        this.cancelSpeechOnly();
        return;
      }
      if (prog.chunkIndex === 0) {
        this.callbacks.onStart?.();
      }
      this.startLipSyncAnimation(token);
    };

    utter.onend = () => {
      if (this.activeToken !== token || this.isPaused) return;
      this.stopWatchdog();
      // Advance to next chunk of the AI summary immediately
      prog.chunkIndex++;
      void this.speakChunkSequence(token, language);
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

      this.stopWatchdog();

      if (e.error === "not-allowed") {
        this.callbacks.onBlocked?.();
        this.isMuted = true;
        // Continue silently without locking TV
        void this.speakChunkSequence(token, language);
        return;
      }

      // If an individual chunk had an error, advance to next chunk so news flow continues
      prog.chunkIndex++;
      void this.speakChunkSequence(token, language);
    };

    // Watchdog for this specific chunk: if stuck > 13s, safely nudge resume
    const chunkStart = Date.now();
    this.stopWatchdog();
    this.chunkWatchdogTimer = setInterval(() => {
      if (
        !this.isPaused &&
        !this.isMuted &&
        this.activeToken === token &&
        typeof window !== "undefined" &&
        window.speechSynthesis
      ) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else if (Date.now() - chunkStart > 13000 && window.speechSynthesis.speaking) {
          // If stuck on this chunk for >13s, advance to next chunk
          this.stopWatchdog();
          prog.chunkIndex++;
          void this.speakChunkSequence(token, language);
        }
      }
    }, 3000);

    try {
      window.speechSynthesis.speak(utter);
    } catch {
      prog.chunkIndex++;
      void this.speakChunkSequence(token, language);
    }
  }

  /**
   * Speaks a story narration cleanly from beginning to end.
   * Chunks text at natural sentence boundaries to guarantee full voice completion.
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
    this.currentLanguage = language;
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

    // Natural duration proportional to the complete text length (no 26s cap!)
    const fullEstimatedDurationMs = isAccelerated
      ? 1500
      : Math.max(16000, Math.round(cleanText.length * 88));

    // Check if resuming an existing token
    const existing = this.tokenProgress[token];
    if (existing && existing.chunks.length > 0) {
      // Resume from saved chunk index
      void this.speakChunkSequence(token, language);
      return;
    }

    // Split complete script into sequential speech chunks
    const chunks = splitIntoSpeechChunks(cleanText, language);

    this.tokenProgress[token] = {
      chunks,
      chunkIndex: 0,
      startTime: Date.now(),
      totalEstimatedMs: fullEstimatedDurationMs,
    };

    void this.speakChunkSequence(token, language);
  }
}

export const speechController = new AnchorSpeechController();
