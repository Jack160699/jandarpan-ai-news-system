/**
 * Global article TTS session — exactly ONE utterance at a time.
 * Native speechSynthesis only; no overlapping playback.
 */

import {
  loadVoices,
  pickVoice,
  resolveSpeechLang,
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
  private rate = 1;
  private utterance: SpeechSynthesisUtterance | null = null;
  private mounted = false;
  private mediaPlayHandler: ((e: Event) => void) | null = null;
  /** Stable reference for useSyncExternalStore — must not allocate per read */
  private snapshot: ArticleSpeechSnapshot = {
    articleId: null,
    status: "idle",
    rate: 1,
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
    const speeds = [0.9, 1, 1.1, 1.2];
    const idx = speeds.indexOf(this.rate);
    this.rate = speeds[(idx + 1) % speeds.length] ?? 1;
    if (this.status === "speaking" && this.utterance) {
      this.utterance.rate = this.rate;
    }
    this.emit();
    return this.rate;
  }

  /** Hard stop — always call before starting a new article */
  cancel(): void {
    const s = synth();
    s?.cancel();
    this.utterance = null;
    const wasActive = this.articleId !== null;
    this.articleId = null;
    this.status = "idle";
    this.emit();
    if (wasActive) {
      window.dispatchEvent(new CustomEvent(ARTICLE_SPEECH_STOP_EVENT));
    }
  }

  private emit(): void {
    if (!this.syncSnapshot()) return;
    for (const l of this.listeners) l();
  }

  private setSession(id: string, status: ArticleSpeechStatus): void {
    this.articleId = id;
    this.status = status;
    this.emit();
  }

  private buildText(payload: ArticleSpeechPayload): string {
    const parts = [payload.headline.trim()];
    if (payload.body?.trim()) parts.push(payload.body.trim());
    return parts.join(". ");
  }

  async toggle(payload: ArticleSpeechPayload): Promise<void> {
    const s = synth();
    if (!s) return;

    const { articleId } = payload;

    if (this.articleId === articleId && this.status === "speaking") {
      s.pause();
      this.status = "paused";
      this.emit();
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
    const lang = resolveSpeechLang(text, payload.langHint);
    const voice = pickVoice(voices, lang);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = this.rate;
    if (voice) utterance.voice = voice;

    const id = payload.articleId;
    this.utterance = utterance;

    utterance.onstart = () => {
      if (this.articleId !== id) return;
      this.status = "speaking";
      this.emit();
    };

    utterance.onend = () => {
      if (this.articleId !== id) return;
      this.cancel();
    };

    utterance.onerror = () => {
      if (this.articleId !== id) return;
      this.cancel();
    };

    this.setSession(id, "speaking");
    window.dispatchEvent(new CustomEvent(ARTICLE_SPEECH_START_EVENT));
    s.speak(utterance);

    if (s.paused) {
      try {
        s.resume();
      } catch {
        /* ignore */
      }
    }
  }

  mountGlobalHandlers(): () => void {
    if (this.mounted || typeof window === "undefined") return () => undefined;
    this.mounted = true;

    const onHide = () => {
      if (document.hidden) this.cancel();
    };

    const onPageHide = () => this.cancel();
    const onBeforeUnload = () => this.cancel();

    this.mediaPlayHandler = (e: Event) => {
      const target = e.target;
      if (
        target instanceof HTMLMediaElement &&
        !target.closest("[data-article-speech-ignore]")
      ) {
        this.cancel();
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
