"use client";

import { useLenis } from "@/providers/SmoothScrollProvider";

export function useLenisScroll() {
  const lenis = useLenis();

  const scrollTo = (
    target: number | string | HTMLElement,
    options?: { offset?: number; duration?: number; immediate?: boolean }
  ) => {
    if (!lenis) return;
    lenis.scrollTo(target, {
      offset: options?.offset ?? 0,
      duration: options?.duration,
      immediate: options?.immediate,
    });
  };

  const stop = () => lenis?.stop();
  const start = () => lenis?.start();

  return { lenis, scrollTo, stop, start };
}
