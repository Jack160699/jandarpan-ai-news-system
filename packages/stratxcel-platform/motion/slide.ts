/**
 * JDP-009 — Slide animation presets
 */
import type { Variants } from "framer-motion";
import type { SlideDirection, VariantFactoryOptions } from "./types";
import { buildTransition, reduceVariants, slideOffset } from "./utils";

const DEFAULT_DISTANCE = 16;

export function createSlideVariants(
  direction: SlideDirection = "up",
  options: VariantFactoryOptions = {}
): Variants {
  const { reduced = false, preset = "normal", distance = DEFAULT_DISTANCE } = options;
  const offset = slideOffset(direction, distance);
  const transition = buildTransition(preset, reduced);

  return reduceVariants(
    {
      hidden: { opacity: 0, ...offset },
      visible: { opacity: 1, x: 0, y: 0, transition },
      exit: {
        opacity: 0,
        ...offset,
        transition: buildTransition("fast", reduced),
      },
    },
    reduced
  );
}

export const slideUpVariants = createSlideVariants("up");
export const slideDownVariants = createSlideVariants("down");
export const slideLeftVariants = createSlideVariants("left");
export const slideRightVariants = createSlideVariants("right");
