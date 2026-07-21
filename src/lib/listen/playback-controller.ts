/**
 * Single-element listen playback controller.
 * Prevents duplicate concurrent playback, gates "playing" on media events,
 * and cleans up listeners on dispose.
 */

import {
  reducePlayerStatus,
  type PlayerErrorCode,
  type PlayerStatus,
} from "./player-state";
import {
  mediaErrorToCode,
  validateAudioSource,
  type AudioSourceInput,
} from "./validate-audio-source";

export type PlaybackSnapshot = {
  status: PlayerStatus;
  currentTime: number;
  duration: number;
  errorCode: PlayerErrorCode | null;
  sourceUrl: string | null;
};

export type PlaybackListener = (snap: PlaybackSnapshot) => void;

export type MediaSessionMeta = {
  title: string;
  artist?: string;
  album?: string;
  artworkUrl?: string | null;
};

type AudioEl = HTMLAudioElement;

let activeController: ListenPlaybackController | null = null;

function claimActiveController(controller: ListenPlaybackController) {
  activeController = controller;
}

export function getActiveListenController(): ListenPlaybackController | null {
  return activeController;
}

export class ListenPlaybackController {
  private audio: AudioEl | null = null;
  private status: PlayerStatus = "idle";
  private errorCode: PlayerErrorCode | null = null;
  private sourceUrl: string | null = null;
  private currentTime = 0;
  private duration = 0;
  private speed = 1;
  private listeners = new Set<PlaybackListener>();
  private playGeneration = 0;
  private disposed = false;
  private sessionMeta: MediaSessionMeta | null = null;
  private wantPlaying = false;

  private onTimeUpdate = () => {
    if (!this.audio) return;
    this.currentTime = this.audio.currentTime;
    if (Number.isFinite(this.audio.duration) && this.audio.duration > 0) {
      this.duration = this.audio.duration;
    }
    this.emit();
  };

  private onDurationChange = () => {
    if (!this.audio) return;
    if (Number.isFinite(this.audio.duration) && this.audio.duration > 0) {
      this.duration = this.audio.duration;
      this.emit();
    }
  };

  private onPlaying = () => {
    this.transition({ type: "PLAYING" });
    this.bindMediaSession();
  };

  private onPause = () => {
    if (!this.wantPlaying) {
      this.transition({ type: "PAUSE" });
    }
  };

  private onWaiting = () => {
    this.transition({ type: "WAITING" });
  };

  private onCanPlay = () => {
    this.transition({ type: "CAN_PLAY" });
    if (this.wantPlaying && this.audio) {
      void this.audio.play().catch((err) => this.handlePlayReject(err));
    }
  };

  private onEnded = () => {
    this.wantPlaying = false;
    this.transition({ type: "ENDED" });
  };

  private onError = () => {
    this.wantPlaying = false;
    const code = mediaErrorToCode(this.audio?.error);
    this.errorCode = code;
    this.transition({ type: "ERROR", code });
  };

  subscribe(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  snapshot(): PlaybackSnapshot {
    return {
      status: this.status,
      currentTime: this.currentTime,
      duration: this.duration,
      errorCode: this.errorCode,
      sourceUrl: this.sourceUrl,
    };
  }

  setSpeed(rate: number) {
    this.speed = rate;
    if (this.audio) this.audio.playbackRate = rate;
  }

  setMediaSessionMeta(meta: MediaSessionMeta | null) {
    this.sessionMeta = meta;
    if (meta && this.status === "playing") this.bindMediaSession();
  }

  /**
   * Load a source without implying playback success.
   * Does not network-probe voice APIs beyond what the audio element does on play.
   */
  loadSource(input: AudioSourceInput, opts?: { preload?: boolean }) {
    this.ensureClaimed();
    const validation = validateAudioSource(input);
    if (!validation.ok) {
      this.teardownAudio();
      this.sourceUrl = null;
      this.errorCode = validation.code;
      this.wantPlaying = false;
      this.currentTime = 0;
      this.duration = 0;
      this.status = reducePlayerStatus(this.status, {
        type: "SOURCE_INVALID",
        code: validation.code,
      });
      this.emit();
      return;
    }

    this.errorCode = null;
    this.sourceUrl = validation.url;
    this.transition({ type: "LOAD_START" });

    const audio = this.ensureAudio();
    const nextAbs = absoluteSrc(validation.url);
    if (audio.src !== nextAbs) {
      audio.pause();
      audio.src = validation.url;
      if (opts?.preload !== false) {
        audio.load();
      }
    }
  }

  /** Request playback — status becomes playing only after media `playing` event. */
  async play(input?: AudioSourceInput, fromSec = 0): Promise<void> {
    this.ensureClaimed();
    const gen = ++this.playGeneration;

    if (input) {
      this.loadSource(input);
    }

    if (!this.sourceUrl) {
      this.errorCode = this.errorCode ?? "missing_url";
      this.status = "unavailable";
      this.emit();
      return;
    }

    this.wantPlaying = true;
    this.transition({ type: "PLAY_REQUEST" });

    const audio = this.ensureAudio();
    if (fromSec > 0 && Number.isFinite(fromSec)) {
      try {
        audio.currentTime = fromSec;
      } catch {
        // ignore seek-before-ready
      }
    }
    audio.playbackRate = this.speed;
    audio.muted = false;
    if (audio.volume === 0) audio.volume = 1;

    try {
      await audio.play();
    } catch (err) {
      if (gen !== this.playGeneration) return;
      // Still buffering metadata — canplay handler will retry play().
      if (audio.readyState < 2) {
        return;
      }
      this.handlePlayReject(err);
    }
  }

  pause() {
    this.wantPlaying = false;
    this.audio?.pause();
    this.transition({ type: "PAUSE" });
  }

  toggle() {
    if (this.status === "playing" || this.status === "buffering") {
      this.pause();
    } else {
      void this.play(undefined, this.currentTime);
    }
  }

  seek(timeSec: number) {
    if (!this.audio) return;
    const dur = this.duration || this.audio.duration || 0;
    const next = Math.max(0, Math.min(timeSec, dur || timeSec));
    try {
      this.audio.currentTime = next;
      this.currentTime = next;
      this.emit();
    } catch {
      // not seekable yet
    }
  }

  seekBy(delta: number) {
    this.seek(this.currentTime + delta);
  }

  stop() {
    this.wantPlaying = false;
    this.playGeneration += 1;
    if (this.audio) {
      this.audio.pause();
      try {
        this.audio.currentTime = 0;
      } catch {
        // ignore
      }
    }
    this.currentTime = 0;
    this.transition({ type: "STOP" });
  }

  retry() {
    if (!this.sourceUrl) {
      this.errorCode = "missing_url";
      this.status = "unavailable";
      this.emit();
      return;
    }
    const url = this.sourceUrl;
    this.errorCode = null;
    this.teardownAudio();
    void this.play({ url }, 0);
  }

  dispose() {
    this.disposed = true;
    this.wantPlaying = false;
    this.playGeneration += 1;
    this.teardownAudio();
    this.listeners.clear();
    if (activeController === this) activeController = null;
    this.clearMediaSession();
  }

  private ensureClaimed() {
    if (this.disposed) {
      throw new Error("ListenPlaybackController disposed");
    }
    if (activeController && activeController !== this) {
      activeController.pause();
    }
    claimActiveController(this);
  }

  private ensureAudio(): AudioEl {
    if (!this.audio) {
      const el = new Audio();
      el.preload = "metadata";
      el.addEventListener("timeupdate", this.onTimeUpdate);
      el.addEventListener("durationchange", this.onDurationChange);
      el.addEventListener("playing", this.onPlaying);
      el.addEventListener("pause", this.onPause);
      el.addEventListener("waiting", this.onWaiting);
      el.addEventListener("canplay", this.onCanPlay);
      el.addEventListener("ended", this.onEnded);
      el.addEventListener("error", this.onError);
      this.audio = el;
    }
    return this.audio;
  }

  private teardownAudio() {
    if (!this.audio) return;
    const el = this.audio;
    el.pause();
    el.removeEventListener("timeupdate", this.onTimeUpdate);
    el.removeEventListener("durationchange", this.onDurationChange);
    el.removeEventListener("playing", this.onPlaying);
    el.removeEventListener("pause", this.onPause);
    el.removeEventListener("waiting", this.onWaiting);
    el.removeEventListener("canplay", this.onCanPlay);
    el.removeEventListener("ended", this.onEnded);
    el.removeEventListener("error", this.onError);
    el.removeAttribute("src");
    el.load();
    this.audio = null;
  }

  private handlePlayReject(err: unknown) {
    this.wantPlaying = false;
    const name =
      err && typeof err === "object" && "name" in err
        ? String((err as { name?: string }).name)
        : "";
    const code: PlayerErrorCode =
      name === "NotAllowedError" ? "autoplay_blocked" : "playback_failed";
    this.errorCode = code;
    this.transition({ type: "ERROR", code });
  }

  private transition(
    event: Parameters<typeof reducePlayerStatus>[1]
  ) {
    this.status = reducePlayerStatus(this.status, event);
    if (event.type === "ERROR" && "code" in event) {
      this.errorCode = event.code;
    }
    if (event.type === "PLAYING") {
      this.errorCode = null;
    }
    this.emit();
  }

  private emit() {
    const snap = this.snapshot();
    for (const listener of this.listeners) listener(snap);
  }

  private bindMediaSession() {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }
    const meta = this.sessionMeta;
    if (!meta) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: meta.title,
        artist: meta.artist ?? "जनदर्पण",
        album: meta.album ?? "सुनें",
        artwork: meta.artworkUrl
          ? [{ src: meta.artworkUrl, sizes: "512x512", type: "image/jpeg" }]
          : [],
      });
      navigator.mediaSession.setActionHandler("play", () => {
        void this.play(undefined, this.currentTime);
      });
      navigator.mediaSession.setActionHandler("pause", () => this.pause());
      navigator.mediaSession.setActionHandler("seekbackward", () =>
        this.seekBy(-15)
      );
      navigator.mediaSession.setActionHandler("seekforward", () =>
        this.seekBy(15)
      );
      navigator.mediaSession.playbackState =
        this.status === "playing" ? "playing" : "paused";
    } catch {
      // Media Session unsupported or handler rejection — ignore
    }
  }

  private clearMediaSession() {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }
    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
    } catch {
      // ignore
    }
  }
}

function absoluteSrc(url: string): string {
  if (typeof window === "undefined") return url;
  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return url;
  }
}
