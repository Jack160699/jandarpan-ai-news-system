import type { Variants } from "framer-motion";
import { DURATION, EASE, STAGGER } from "./easing";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE.cinematic },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.slow, ease: EASE.editorial },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: STAGGER.editorial,
      delayChildren: 0.14,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE.cinematic },
  },
};

export const editorialParagraph: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(3px)" },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: DURATION.cinematic,
      ease: EASE.paper,
      delay: i * STAGGER.loose,
    },
  }),
};

export const typographyReveal: Variants = {
  hidden: {
    opacity: 0,
    y: "1.1em",
    clipPath: "inset(100% 0 0 0)",
  },
  visible: {
    opacity: 1,
    y: 0,
    clipPath: "inset(0% 0 0 0)",
    transition: {
      duration: DURATION.editorial,
      ease: EASE.reveal,
    },
  },
};

export const newspaperFold: Variants = {
  hidden: {
    opacity: 0,
    rotateX: -5,
    y: 18,
    transformOrigin: "top center",
  },
  visible: {
    opacity: 1,
    rotateX: 0,
    y: 0,
    transition: {
      duration: DURATION.cinematic,
      ease: EASE.paper,
    },
  },
};

export const delayedOpacity: Variants = {
  hidden: { opacity: 0 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    transition: {
      duration: DURATION.slow,
      ease: EASE.editorial,
      delay,
    },
  }),
};

export const imageParallax = {
  y: ["-6%", "6%"],
  transition: { ease: "linear" as const },
};
