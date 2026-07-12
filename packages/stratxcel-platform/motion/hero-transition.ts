/**
 * JDP-009 — Hero / shared-element transition presets
 */
import type { Transition, Variants } from "framer-motion";
import type { VariantFactoryOptions } from "./types";
import { buildTransition, reduceVariants } from "./utils";

export type HeroTransitionOptions = VariantFactoryOptions & {
  layoutId?: string;
};

export function createHeroVariants(options: HeroTransitionOptions = {}): Variants {
  const { reduced = false, preset = "slow" } = options;
  const transition = buildTransition(preset, reduced);

  return reduceVariants(
    {
      initial: { opacity: 0.85, scale: 0.98 },
      animate: { opacity: 1, scale: 1, transition },
      exit: { opacity: 0.9, scale: 0.99, transition: buildTransition("normal", reduced) },
    },
    reduced
  );
}

export function heroLayoutTransition(options: VariantFactoryOptions = {}): Transition {
  const { reduced = false } = options;
  if (reduced) return { duration: 0 };

  return {
    type: "spring",
    stiffness: 320,
    damping: 32,
    ...buildTransition("slow", false),
  };
}

export const heroVariants = createHeroVariants();
