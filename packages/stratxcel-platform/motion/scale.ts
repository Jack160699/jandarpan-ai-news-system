/**
 * JDP-009 — Scale animation presets
 */
import type { Variants } from "framer-motion";
import type { VariantFactoryOptions } from "./types";
import { buildTransition, INSTANT_TRANSITION, reduceVariants } from "./utils";

export function createScaleVariants(options: VariantFactoryOptions = {}): Variants {
  const { reduced = false, preset = "normal" } = options;
  const transition = buildTransition(preset, reduced);

  return reduceVariants(
    {
      hidden: { opacity: 0, scale: 0.96 },
      visible: { opacity: 1, scale: 1, transition },
      exit: { opacity: 0, scale: 0.98, transition: buildTransition("fast", reduced) },
    },
    reduced
  );
}

export function createPopVariants(options: VariantFactoryOptions = {}): Variants {
  const { reduced = false } = options;

  return reduceVariants(
    {
      hidden: { opacity: 0, scale: 0.9 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: buildTransition("fast", reduced, { type: "spring", stiffness: 420, damping: 28 }),
      },
      exit: { opacity: 0, scale: 0.95, transition: INSTANT_TRANSITION },
    },
    reduced
  );
}

export const scaleVariants = createScaleVariants();
export const popVariants = createPopVariants();
