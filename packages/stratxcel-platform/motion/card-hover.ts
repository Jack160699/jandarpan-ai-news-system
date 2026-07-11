/**
 * JDP-009 — Card hover interaction presets
 */
import type { TargetAndTransition, Transition } from "framer-motion";
import { motionScale } from "../tokens/motion";
import { buildTransition } from "./utils";

export type CardHoverOptions = {
  reduced?: boolean;
  lift?: number;
  scale?: number;
};

export function cardHoverMotion(options: CardHoverOptions = {}): {
  whileHover: TargetAndTransition;
  whileTap: TargetAndTransition;
  transition: Transition;
} {
  const { reduced = false, lift = Math.abs(motionScale.hoverLift), scale = 1.01 } = options;

  if (reduced) {
    return {
      whileHover: {},
      whileTap: {},
      transition: { duration: 0 },
    };
  }

  return {
    whileHover: {
      y: -lift,
      scale,
      transition: buildTransition("fast", false),
    },
    whileTap: {
      scale: motionScale.tap,
      y: 0,
      transition: buildTransition("fast", false),
    },
    transition: buildTransition("normal", false),
  };
}

export function cardHoverProps(options: CardHoverOptions = {}) {
  const { whileHover, whileTap, transition } = cardHoverMotion(options);
  return { whileHover, whileTap, transition };
}
