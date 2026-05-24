/**
 * Global article TTS session — exactly ONE utterance queue at a time.
 */

import {
  loadVoices,
  pickVoice,
  resolveSpeechLang,
  splitSpeechChunks,
  SPEECH_DEFAULT_PITCH,
  SPEECH_DEFAULT_RATE,
  SPEECH_DEFAULT_VOLUME,
  type SpeechLangHint,
} from "@/lib/speech/voice-utils";

export type ArticleSpeechStatus = "idle" | "speaking" | "paused";

export type ArticleSpeechPayload = {
  articleId: string;
  headline: string;
  body?: string;
  langHint?: SpeechLangHint;
};

export type ArticleSpeechSnapshot = {
  articleId: string | null;
  status: ArticleSpeechStatus;
  rate: number;
};

type Listener = () => void;

export const ARTICLE_SPEECH_START_EVENT = "jd-article-speech-start";
export const ARTICLE_SPEECH_STOP_EVENT = "jd-article-speech-stop";

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

class ArticleSpeechController {
  private listeners = new Set<Listener>();
  private articleId: string | null = null;
  private status: ArticleSpeechStatus = "idle";
  private rate = SPEECH_DEFAULT_RATE;
  private sessionId: string | null = null;
  private chunkIndex = 0;
  private chunks: string[] = [];
  private voice: SpeechSynthesisVoice | null = null;
  private lang: "hi-IN" | "en-IN" = "en-IN";
  private mounted = false;
  private mediaPlayHandler: ((e: Event) => void) | null = null;
  private snapshot: ArticleSpeechSnapshot = {
    articleId: null,
    status: "idle",
    rate: SPEECH_DEFAULT_RATE,
  };

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): ArticleSpeechSnapshot {
    return this.snapshot;
  }

  private syncSnapshot(): boolean {
    const prev = this.snapshot;
    if (
      prev.articleId === this.articleId &&
      prev.status === this.status &&
      prev.rate === this.rate
    ) {
      return false;
    }
    this.snapshot = {
      articleId: this.articleId,
      status: this.status,
      rate: this.rate,
    };
    return true;
  }

  isActive(articleId: string): boolean {
    return this.articleId === articleId && this.status !== "idle";
  }

  isSpeaking(articleId: string): boolean {
    return this.articleId === articleId && this.status === "speaking";
  }

  isPaused(articleId: string): boolean {
    return this.articleId === articleId && this.status === "paused";
  }

  getRate(): number {
    return this.rate;
  }

  cycleRate(): number {
    const speeds = [0.85, 0.9, 1, 1.05];
    const idx = speeds.indexOf(this.rate);
    this.rate = speeds[(idx + 1) % speeds.length] ?? SPEECH_DEFAULT_RATE;
    this.emit();
    return this.rate;
  }

  /** Hard stop — always call before starting a new article */
  cancel(): void {
    const s = synth();
    s?.cancel();
    this.chunks = [];
    this.chunkIndex = 0;
    this.sessionId = null;
    this.voice = null;
    const wasActive = this.articleId !== null;
    this.articleId = null;
    this.status = "idle";
    this.emit();
    if (wasActive) {
      window.dispatchEvent(new CustomEvent(ARTICLE_SPEECH_STOP_EVENT));
    }
  }

  private pause(): void {
    const s = synth();
    if (!s || this.status !== "speaking") return;
    s.pause();
    this.status = "paused";
    this.emit();
  }

  private emit(): void {
    if (!this.syncSnapshot()) return;
    for (const l of this.listeners) l();
  }

  private buildText(payload: ArticleSpeechPayload): string {
    const parts = [payload.headline.trim()];
    if (payload.body?.trim()) parts.push(payload.body.trim());
    return parts.join(". ");
  }

  private makeUtterance(text: string): SpeechSynthesisUtterance {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.lang;
    utterance.rate = this.rate;
    utterance.pitch = SPEECH_DEFAULT_PITCH;
    utterance.volume = SPEECH_DEFAULT_VOLUME;
    if (this.voice) utterance.voice = this.voice;
    return utterance;
  }

  private speakCurrentChunk(): void {
    const s = synth();
    if (!s || !this.sessionId || this.articleId === null) return;

    if (this.chunkIndex >= this.chunks.length) {
      this.cancel();
      return;
    }

    const session = this.sessionId;
    const id = this.articleId;
    const text = this.chunks[this.chunkIndex]!;
    const utterance = this.makeUtterance(text);

    utterance.onstart = () => {
      if (this.sessionId !== session || this.articleId !== id) return;
      this.status = "speaking";
      this.emit();
    };

    utterance.onend = () => {
      if (this.sessionId !== session || this.articleId !== id) return;
      this.chunkIndex += 1;
      if (this.chunkIndex < this.chunks.length) {
        window.setTimeout(() => {
          if (this.sessionId === session && this.articleId === id) {
            this.speakCurrentChunk();
          }
        }, 280);
      } else {
        this.cancel();
      }
    };

    utterance.onerror = () => {
      if (this.sessionId !== session) return;
      this.cancel();
    };

    s.speak(utterance);

    if (s.paused) {
      try {
        s.resume();
      } catch {
        /* ignore */
      }
    }
  }

  async toggle(payload: ArticleSpeechPayload): Promise<void> {
    const s = synth();
    if (!s) return;

    const { articleId } = payload;

    if (this.articleId === articleId && this.status === "speaking") {
      this.pause();
      return;
    }

    if (this.articleId === articleId && this.status === "paused") {
      try {
        s.resume();
        this.status = "speaking";
        this.emit();
      } catch {
        await this.start(payload);
      }
      return;
    }

    await this.start(payload);
  }

  async start(payload: ArticleSpeechPayload): Promise<void> {
    const s = synth();
    if (!s) return;

    this.cancel();

    const text = this.buildText(payload);
    if (!text) return;

    const voices = await loadVoices();
    this.lang = resolveSpeechLang(text, payload.langHint);
    this.voice = pickVoice(voices, this.lang);
    this.chunks = splitSpeechChunks(text);
    if (!this.chunks.length) return;

    const id = payload.articleId;
    this.articleId = id;
    this.sessionId = `${id}-${Date.now()}`;
    this.chunkIndex = 0;
    this.status = "speaking";
    this.emit();

    window.dispatchEvent(new CustomEvent(ARTICLE_SPEECH_START_EVENT));
    this.speakCurrentChunk();
  }

  mountGlobalHandlers(): () => void {
    if (this.mounted || typeof window === "undefined") return () => undefined;
    this.mounted = true;

    const onHide = () => {
      if (document.hidden && this.status === "speaking") this.pause();
    };

    const onPageHide = () => this.cancel();
    const onBeforeUnload = () => this.cancel();

    this.mediaPlayHandler = (e: Event) => {
      const target = e.target;
      if (
        target instanceof HTMLMediaElement &&
        !target.closest("[data-article-speech-ignore]") &&
        this.status === "speaking"
      ) {
        this.pause();
      }
    };

    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("play", this.mediaPlayHandler, true);

    return () => {
      this.mounted = false;
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (this.mediaPlayHandler) {
        document.removeEventListener("play", this.mediaPlayHandler, true);
      }
      this.cancel();
    };
  }
}

export const articleSpeechController = new ArticleSpeechController();
