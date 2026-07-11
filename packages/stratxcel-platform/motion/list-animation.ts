/**
 * JDP-009 — List enter / exit / layout animation presets
 */
import type { Variants } from "framer-motion";
import type { VariantFactoryOptions } from "./types";
import { buildTransition, reduceVariants, slideOffset } from "./utils";

const DEFAULT_STAGGER = 0.04;
const DEFAULT_DISTANCE = 10;

export function createListContainerVariants(options: VariantFactoryOptions = {}): Variants {
  const { reduced = false, stagger = DEFAULT_STAGGER } = options;

  return reduceVariants(
    {
      hidden: {},
      visible: {
        transition: {
          staggerChildren: reduced ? 0 : stagger,
          delayChildren: reduced ? 0 : 0.02,
        },
      },
      exit: {
        transition: {
          staggerChildren: reduced ? 0 : stagger * 0.5,
          staggerDirection: -1,
        },
      },
    },
    reduced
  );
}

export function createListItemVariants(options: VariantFactoryOptions = {}): Variants {
  const { reduced = false, preset = "fast", distance = DEFAULT_DISTANCE } = options;
  const offset = slideOffset("up", distance);

  return reduceVariants(
    {
      hidden: { opacity: 0, ...offset, height: reduced ? "auto" : 0, overflow: "hidden" },
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        height: "auto",
        transition: buildTransition(preset, reduced),
      },
      exit: {
        opacity: 0,
        ...offset,
        height: reduced ? "auto" : 0,
        transition: buildTransition("fast", reduced),
      },
    },
    reduced
  );
}

export function createListReorderVariants(options: VariantFactoryOptions = {}): Variants {
  const { reduced = false, preset = "normal" } = options;

  return reduceVariants(
    {
      hidden: { opacity: 0, scale: 0.98 },
      visible: { opacity: 1, scale: 1, transition: buildTransition(preset, reduced) },
      exit: { opacity: 0, scale: 0.98, transition: buildTransition("fast", reduced) },
    },
    reduced
  );
}

export const listContainerVariants = createListContainerVariants();
export const listItemVariants = createListItemVariants();
export const listReorderVariants = createListReorderVariants();
