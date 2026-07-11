/**
 * JDP-009 — Scroll / in-view reveal presets
 */
import type { Transition, Variants } from "framer-motion";
import type { RevealAxis, SlideDirection, VariantFactoryOptions } from "./types";
import { buildTransition, reduceVariants, slideOffset } from "./utils";

const DEFAULT_DISTANCE = 20;

export type RevealOptions = VariantFactoryOptions & {
  axis?: RevealAxis;
  direction?: SlideDirection;
  once?: boolean;
  margin?: string;
  amount?: number | "some" | "all";
};

export function createRevealVariants(options: RevealOptions = {}): Variants {
  const {
    reduced = false,
    preset = "normal",
    distance = DEFAULT_DISTANCE,
    direction = "up",
  } = options;
  const offset = slideOffset(direction, distance);
  const transition = buildTransition(preset, reduced);

  return reduceVariants(
    {
      hidden: { opacity: 0, ...offset },
      visible: { opacity: 1, x: 0, y: 0, transition },
    },
    reduced
  );
}

export function revealViewportOptions(options: RevealOptions = {}) {
  return {
    once: options.once ?? true,
    margin: options.margin ?? "0px 0px -8% 0px",
    amount: options.amount ?? 0.2,
  };
}

export function revealTransition(options: RevealOptions = {}): Transition {
  return buildTransition(options.preset ?? "normal", options.reduced ?? false);
}

export const revealVariants = createRevealVariants();
