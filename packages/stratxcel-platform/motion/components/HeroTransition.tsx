"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { createHeroVariants, heroLayoutTransition } from "../hero-transition";
import { useMotionConfig } from "../useMotionConfig";

export type HeroTransitionProps = HTMLMotionProps<"div"> & {
  /** Shared layout id for cross-route hero morphing */
  layoutId?: string;
  animateOnMount?: boolean;
};

/** Hero / lead story transition with optional shared layoutId. */
export function HeroTransition({
  className,
  layoutId,
  animateOnMount = true,
  layout = true,
  initial = "initial",
  animate = animateOnMount ? "animate" : undefined,
  exit = "exit",
  transition: transitionProp,
  variants: variantsProp,
  ...props
}: HeroTransitionProps) {
  const { reduced } = useMotionConfig();
  const variants = useMemo(
    () => variantsProp ?? createHeroVariants({ reduced }),
    [variantsProp, reduced]
  );
  const transition = useMemo(
    () => transitionProp ?? heroLayoutTransition({ reduced }),
    [transitionProp, reduced]
  );

  return (
    <motion.div
      className={cn("jds-motion-hero", className)}
      layout={reduced ? false : layout}
      layoutId={layoutId}
      variants={variants}
      initial={initial}
      animate={animate}
      exit={exit}
      transition={transition}
      {...props}
    />
  );
}
