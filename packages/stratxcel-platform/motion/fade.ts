/**
 * JDP-009 — Fade animation presets
 */
import type { Transition, Variants } from "framer-motion";
import type { VariantFactoryOptions } from "./types";
import { buildTransition, reduceVariants } from "./utils";

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export function createFadeVariants(options: VariantFactoryOptions = {}): Variants {
  const { reduced = false, preset = "normal" } = options;
  const transition = buildTransition(preset, reduced);

  return reduceVariants(
    {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition },
      exit: { opacity: 0, transition: buildTransition("fast", reduced) },
    },
    reduced
  );
}

export function fadeTransition(options: VariantFactoryOptions = {}): Transition {
  return buildTransition(options.preset ?? "normal", options.reduced ?? false);
}
