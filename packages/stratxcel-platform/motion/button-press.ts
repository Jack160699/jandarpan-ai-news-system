/**
 * JDP-009 — Button press interaction presets
 */
import type { TargetAndTransition, Transition } from "framer-motion";
import { motionScale } from "../tokens/motion";
import { buildTransition, INSTANT_TRANSITION } from "./utils";

export type ButtonPressOptions = {
  reduced?: boolean;
  scale?: number;
};

export function buttonPressMotion(options: ButtonPressOptions = {}): {
  whileTap: TargetAndTransition;
  whileHover: TargetAndTransition;
  transition: Transition;
} {
  const { reduced = false, scale = motionScale.tap } = options;

  if (reduced) {
    return {
      whileTap: {},
      whileHover: {},
      transition: { duration: 0 },
    };
  }

  return {
    whileTap: { scale, transition: INSTANT_TRANSITION },
    whileHover: { scale: 1.01, transition: buildTransition("fast", false) },
    transition: buildTransition("fast", false),
  };
}

export function buttonPressProps(options: ButtonPressOptions = {}) {
  const { whileTap, whileHover, transition } = buttonPressMotion(options);
  return { whileTap, whileHover, transition };
}
