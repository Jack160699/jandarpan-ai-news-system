import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getActiveListenController,
  ListenPlaybackController,
} from "./playback-controller";

type Handler = (ev: { type: string }) => void;

class MockAudio {
  static instances: MockAudio[] = [];
  src = "";
  currentTime = 0;
  duration = 90;
  playbackRate = 1;
  muted = false;
  volume = 1;
  preload = "metadata";
  readyState = 0;
  error: { code: number } | null = null;
  paused = true;
  private listeners = new Map<string, Set<Handler>>();

  constructor() {
    MockAudio.instances.push(this);
  }

  addEventListener(type: string, listener: Handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: Handler) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string) {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const listener of set) listener({ type });
  }

  load() {
    this.readyState = 1;
  }

  play() {
    this.paused = false;
    this.readyState = 4;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
    this.dispatch("pause");
  }

  removeAttribute(name: string) {
    if (name === "src") this.src = "";
  }
}

describe("ListenPlaybackController", () => {
  beforeEach(() => {
    MockAudio.instances = [];
    vi.stubGlobal("Audio", MockAudio);
    vi.stubGlobal("window", {
      location: { origin: "http://localhost:3000" },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not report playing until media playing event", async () => {
    const c = new ListenPlaybackController();
    await c.play({ url: "/api/shorts/voice/demo" });
    expect(c.snapshot().status).not.toBe("playing");

    MockAudio.instances[0]?.dispatch("playing");
    expect(c.snapshot().status).toBe("playing");
    c.dispose();
  });

  it("marks unavailable for missing source", async () => {
    const c = new ListenPlaybackController();
    await c.play({ url: null });
    expect(c.snapshot().status).toBe("unavailable");
    expect(c.snapshot().errorCode).toBe("missing_url");
    c.dispose();
  });

  it("marks failed on media error and supports retry", async () => {
    const c = new ListenPlaybackController();
    await c.play({ url: "/fixtures/listen-tone.mp3" });
    const el = MockAudio.instances[0]!;
    el.error = { code: 4 };
    el.dispatch("error");
    expect(c.snapshot().status).toBe("failed");
    expect(c.snapshot().errorCode).toBe("unsupported_mime");

    c.retry();
    expect(c.snapshot().status).not.toBe("playing");
    MockAudio.instances.at(-1)?.dispatch("playing");
    expect(c.snapshot().status).toBe("playing");
    c.dispose();
  });

  it("updates progress and duration from media events", async () => {
    const c = new ListenPlaybackController();
    await c.play({ url: "/fixtures/listen-tone.mp3" });
    const el = MockAudio.instances[0]!;
    el.duration = 58;
    el.currentTime = 12;
    el.dispatch("durationchange");
    el.dispatch("timeupdate");
    expect(c.snapshot().duration).toBe(58);
    expect(c.snapshot().currentTime).toBe(12);
    c.dispose();
  });

  it("enters ended without falsely completing early", async () => {
    const c = new ListenPlaybackController();
    await c.play({ url: "/fixtures/listen-tone.mp3" });
    MockAudio.instances[0]?.dispatch("playing");
    MockAudio.instances[0]?.dispatch("ended");
    expect(c.snapshot().status).toBe("ended");
    c.dispose();
  });

  it("stops previous controller when a new one starts (no duplicate playback)", async () => {
    const a = new ListenPlaybackController();
    const b = new ListenPlaybackController();
    await a.play({ url: "/api/shorts/voice/one" });
    MockAudio.instances[0]?.dispatch("playing");
    expect(a.snapshot().status).toBe("playing");

    await b.play({ url: "/api/shorts/voice/two" });
    expect(a.snapshot().status).toBe("paused");
    expect(getActiveListenController()).toBe(b);
    a.dispose();
    b.dispose();
  });

  it("handles rapid play/pause taps without stuck playing", async () => {
    const c = new ListenPlaybackController();
    const p1 = c.play({ url: "/api/shorts/voice/rapid" });
    c.pause();
    await p1;
    expect(c.snapshot().status).toBe("paused");
    const p2 = c.play();
    MockAudio.instances[0]?.dispatch("playing");
    await p2;
    c.pause();
    c.pause();
    expect(c.snapshot().status).toBe("paused");
    c.dispose();
  });

  it("buffers on waiting while playing", async () => {
    const c = new ListenPlaybackController();
    await c.play({ url: "/api/shorts/voice/buf" });
    MockAudio.instances[0]?.dispatch("playing");
    MockAudio.instances[0]?.dispatch("waiting");
    expect(c.snapshot().status).toBe("buffering");
    MockAudio.instances[0]?.dispatch("playing");
    expect(c.snapshot().status).toBe("playing");
    c.dispose();
  });

  it("cleans up on dispose (no active leak)", async () => {
    const c = new ListenPlaybackController();
    await c.play({ url: "/api/shorts/voice/dispose" });
    c.dispose();
    expect(getActiveListenController()).toBeNull();
  });

  it("rejects inaccessible signed URL via validation before play", async () => {
    const payload = Buffer.from(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 120 })
    ).toString("base64url");
    const url = `https://storage.example/a.mp3?token=hdr.${payload}.sig`;
    const c = new ListenPlaybackController();
    await c.play({ url });
    expect(c.snapshot().status).toBe("unavailable");
    expect(c.snapshot().errorCode).toBe("expired");
    c.dispose();
  });

  it("rejects unsupported mime at validation", async () => {
    const c = new ListenPlaybackController();
    await c.play({
      url: "https://cdn.example/file.bin",
      mimeType: "application/pdf",
    });
    expect(c.snapshot().status).toBe("unavailable");
    expect(c.snapshot().errorCode).toBe("unsupported_mime");
    c.dispose();
  });
});
