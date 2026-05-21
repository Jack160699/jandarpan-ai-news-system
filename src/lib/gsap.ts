"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

export function registerGsap() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.config({
    nullTargetWarn: false,
    force3D: true,
  });
  ScrollTrigger.config({
    limitCallbacks: true,
    ignoreMobileResize: true,
  });
  ScrollTrigger.defaults({
    scroller: document.documentElement,
    markers: false,
  });
  registered = true;
}

registerGsap();

export { gsap, ScrollTrigger };

export const cinematicEase = "power3.out";
export const editorialEase = "power2.inOut";
export const paperEase = "expo.out";

export function createScrollTimeline(
  trigger: gsap.DOMTarget,
  vars?: ScrollTrigger.Vars
) {
  registerGsap();
  return gsap.timeline({
    scrollTrigger: {
      trigger,
      start: "top 82%",
      end: "bottom 18%",
      toggleActions: "play none none reverse",
      ...vars,
    },
  });
}

export function refreshScroll() {
  if (typeof window === "undefined") return;
  ScrollTrigger.refresh();
}
