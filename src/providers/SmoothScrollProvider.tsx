"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { registerGsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type LenisInstance = Lenis | null;

const LenisContext = createContext<LenisInstance>(null);

export function useLenis() {
  return useContext(LenisContext);
}

const CINEMATIC_EASE = (t: number) => 1 - Math.pow(1 - t, 4);

type SmoothScrollProviderProps = {
  children: ReactNode;
};

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const [lenis, setLenis] = useState<LenisInstance>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      document.documentElement.classList.add("lenis-reduced");
      return;
    }

    registerGsap();

    const isMobile = window.matchMedia("(max-width: 767px)").matches;

    const instance = new Lenis({
      autoRaf: false,
      lerp: isMobile ? 0.09 : 0.055,
      duration: isMobile ? 1.5 : 1.55,
      easing: CINEMATIC_EASE,
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.75,
      touchMultiplier: isMobile ? 1.25 : 1.4,
      syncTouch: true,
      syncTouchLerp: isMobile ? 0.12 : 0.08,
      touchInertiaExponent: 1.75,
      infinite: false,
      autoResize: true,
      overscroll: true,
    });

    setLenis(instance);
    document.documentElement.classList.add("lenis", "lenis-smooth");

    const onScroll = () => ScrollTrigger.update();
    instance.on("scroll", onScroll);

    ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value) {
        if (arguments.length && typeof value === "number") {
          instance.scrollTo(value, { immediate: true });
        }
        return instance.scroll;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      },
      pinType:
        getComputedStyle(document.documentElement).transform !== "none"
          ? "transform"
          : "fixed",
    });

    const onRefresh = () => instance.resize();
    ScrollTrigger.addEventListener("refresh", onRefresh);

    let rafId = 0;
    const raf = (time: number) => {
      instance.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    ScrollTrigger.refresh();

    return () => {
      cancelAnimationFrame(rafId);
      document.documentElement.classList.remove(
        "lenis",
        "lenis-smooth",
        "lenis-reduced"
      );
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      instance.off("scroll", onScroll);
      ScrollTrigger.scrollerProxy(document.documentElement, {});
      instance.destroy();
      setLenis(null);
    };
  }, [reducedMotion]);

  const value = useMemo(() => lenis, [lenis]);

  return (
    <LenisContext.Provider value={value}>{children}</LenisContext.Provider>
  );
}
