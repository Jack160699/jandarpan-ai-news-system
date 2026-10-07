"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pickRecorderMime } from "@/features/user-news/upload";

export type RecorderState = "idle" | "recording" | "done" | "unsupported" | "denied";

/** Records a short voice note in the browser (WebM/Ogg Opus), capped at maxSeconds. Nothing leaves the device until the author submits. */
export function useVoiceRecorder(maxSeconds = 60) {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    const supported = typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
    if (!supported || !pickRecorderMime((m) => MediaRecorder.isTypeSupported(m))) setState("unsupported");
  }, []);

  const cleanup = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const stop = useCallback(() => {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    cleanup();
  }, [cleanup]);

  const start = useCallback(async () => {
    if (state === "unsupported") return;
    const mime = pickRecorderMime((m) => MediaRecorder.isTypeSupported(m));
    if (!mime) {
      setState("unsupported");
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setState("denied");
      return;
    }
    chunks.current = [];
    setBlob(null);
    setSeconds(0);
    const rec = new MediaRecorder(stream.current, { mimeType: mime });
    recorder.current = rec;
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
    rec.onstop = () => {
      setBlob(new Blob(chunks.current, { type: mime.split(";")[0] }));
      setState("done");
    };
    rec.start();
    setState("recording");
    let s = 0;
    timer.current = setInterval(() => {
      s += 1;
      setSeconds(s);
      if (s >= maxSeconds) stop();
    }, 1000);
  }, [maxSeconds, state, stop]);

  const reset = useCallback(() => {
    cleanup();
    setBlob(null);
    setSeconds(0);
    setState("idle");
  }, [cleanup]);

  return { state, seconds, blob, start, stop, reset, maxSeconds };
}
