/**
 * JDP-009 — Stagger container + item presets
 */
import type { Variants } from "framer-motion";
import type { VariantFactoryOptions } from "./types";
import { buildTransition, reduceVariants, slideOffset } from "./utils";

const DEFAULT_STAGGER = 0.06;
const DEFAULT_DISTANCE = 12;

export function createStaggerContainerVariants(options: VariantFactoryOptions = {}): Variants {
  const { reduced = false, preset = "normal", stagger = DEFAULT_STAGGER } = options;

  return reduceVariants(
    {
      hidden: { opacity: 1 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: reduced ? 0 : stagger,
          delayChildren: reduced ? 0 : 0.04,
          ...buildTransition(preset, reduced),
        },
      },
      exit: {
        opacity: 1,
        transition: {
          staggerChildren: reduced ? 0 : stagger * 0.5,
          staggerDirection: -1,
        },
      },
    },
    reduced
  );
}

export function createStaggerItemVariants(options: VariantFactoryOptions = {}): Variants {
  const { reduced = false, preset = "normal", distance = DEFAULT_DISTANCE } = options;
  const offset = slideOffset("up", distance);
  const transition = buildTransition(preset, reduced);

  return reduceVariants(
    {
      hidden: { opacity: 0, ...offset },
      visible: { opacity: 1, x: 0, y: 0, transition },
      exit: { opacity: 0, ...offset, transition: buildTransition("fast", reduced) },
    },
    reduced
  );
}

export const staggerContainerVariants = createStaggerContainerVariants();
export const staggerItemVariants = createStaggerItemVariants();
