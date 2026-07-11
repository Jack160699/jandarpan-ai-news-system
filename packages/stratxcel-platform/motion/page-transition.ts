/**
 * JDP-009 — Page / route transition presets
 *
 * Timings align with platform route transition config (160ms exit + 280ms enter).
 */
import type { Transition, Variants } from "framer-motion";
import type { VariantFactoryOptions } from "./types";
import { buildTransition, reduceVariants, msToSeconds } from "./utils";
import { durations } from "../tokens/durations";

export const PAGE_EXIT_MS = durations.fast;
export const PAGE_ENTER_MS = durations.normal;

export function createPageVariants(options: VariantFactoryOptions = {}): Variants {
  const { reduced = false } = options;

  const exitTransition: Transition = reduced
    ? { duration: 0 }
    : { duration: msToSeconds(PAGE_EXIT_MS), ease: [0.22, 1, 0.36, 1] };

  const enterTransition: Transition = reduced
    ? { duration: 0 }
    : { duration: msToSeconds(PAGE_ENTER_MS), ease: [0.22, 1, 0.36, 1] };

  return reduceVariants(
    {
      initial: { opacity: 0, y: reduced ? 0 : 8 },
      animate: { opacity: 1, y: 0, transition: enterTransition },
      exit: { opacity: 0, y: reduced ? 0 : -4, transition: exitTransition },
    },
    reduced
  );
}

export function pageTransition(options: VariantFactoryOptions = {}): Transition {
  return buildTransition("normal", options.reduced ?? false);
}

export const pageVariants = createPageVariants();
