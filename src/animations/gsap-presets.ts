"use client";

import {
  cinematicEase,
  editorialEase,
  gsap,
  paperEase,
  registerGsap,
  ScrollTrigger,
} from "@/lib/gsap";
import { DURATION, STAGGER } from "./easing";

registerGsap();

type DOMTarget = gsap.DOMTarget;

function resolveTrigger(
  target: DOMTarget,
  override?: ScrollTrigger.Vars["trigger"]
): ScrollTrigger.Vars["trigger"] {
  if (override) return override;
  if (typeof target === "string") return target;
  if (target instanceof Element) return target;
  if (Array.isArray(target) && target[0] instanceof Element) return target[0];
  return target as ScrollTrigger.Vars["trigger"];
}

export function animateFadeUp(
  targets: DOMTarget,
  options?: { delay?: number; stagger?: number; y?: number }
) {
  return gsap.from(targets, {
    opacity: 0,
    y: options?.y ?? 32,
    duration: DURATION.slow,
    ease: cinematicEase,
    delay: options?.delay ?? 0,
    stagger: options?.stagger ?? STAGGER.editorial,
  });
}

export function animateStaggerReveal(
  targets: DOMTarget,
  scrollTrigger?: ScrollTrigger.Vars
) {
  return gsap.from(targets, {
    opacity: 0,
    y: 24,
    duration: DURATION.base,
    ease: cinematicEase,
    stagger: STAGGER.editorial,
    scrollTrigger: {
      trigger: resolveTrigger(targets, scrollTrigger?.trigger),
      start: "top 85%",
      toggleActions: "play none none reverse",
      ...scrollTrigger,
    },
  });
}

export function animateEditorialParagraph(
  targets: DOMTarget,
  scrollTrigger?: ScrollTrigger.Vars
) {
  return gsap.from(targets, {
    opacity: 0,
    y: 14,
    filter: "blur(6px)",
    duration: DURATION.editorial,
    ease: paperEase,
    stagger: STAGGER.loose,
    scrollTrigger: {
      trigger: resolveTrigger(targets, scrollTrigger?.trigger),
      start: "top 88%",
      toggleActions: "play none none reverse",
      ...scrollTrigger,
    },
  });
}

export function animateTypographyReveal(
  target: DOMTarget,
  scrollTrigger?: ScrollTrigger.Vars
) {
  return gsap.from(target, {
    opacity: 0,
    yPercent: 110,
    clipPath: "inset(100% 0% 0% 0%)",
    duration: DURATION.editorial,
    ease: editorialEase,
    scrollTrigger: {
      trigger: resolveTrigger(target, scrollTrigger?.trigger),
      start: "top 82%",
      toggleActions: "play none none reverse",
      ...scrollTrigger,
    },
  });
}

export function animateNewspaperFold(
  target: DOMTarget,
  scrollTrigger?: ScrollTrigger.Vars
) {
  return gsap.from(target, {
    opacity: 0,
    rotateX: -10,
    y: 28,
    transformOrigin: "top center",
    duration: DURATION.slow,
    ease: paperEase,
    scrollTrigger: {
      trigger: resolveTrigger(target, scrollTrigger?.trigger),
      start: "top 80%",
      toggleActions: "play none none reverse",
      ...scrollTrigger,
    },
  });
}

export function animateDelayedOpacity(
  target: DOMTarget,
  delay = 0.2,
  scrollTrigger?: ScrollTrigger.Vars
) {
  return gsap.from(target, {
    opacity: 0,
    duration: DURATION.slow,
    ease: editorialEase,
    delay,
    scrollTrigger: {
      trigger: resolveTrigger(target, scrollTrigger?.trigger),
      start: "top 90%",
      toggleActions: "play none none reverse",
      ...scrollTrigger,
    },
  });
}

export function animateImageParallax(target: DOMTarget, amount = 80) {
  return gsap.to(target, {
    yPercent: amount * -0.12,
    ease: "none",
    scrollTrigger: {
      trigger: resolveTrigger(target),
      start: "top bottom",
      end: "bottom top",
      scrub: 0.6,
    },
  });
}
