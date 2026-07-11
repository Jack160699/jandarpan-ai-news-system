"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { createSlideVariants } from "../slide";
import type { SlideDirection } from "../types";
import { useMotionConfig } from "../useMotionConfig";

export type SlideProps = HTMLMotionProps<"div"> & {
  direction?: SlideDirection;
  distance?: number;
  animateOnMount?: boolean;
};

/** Directional slide + fade wrapper. */
export function Slide({
  className,
  direction = "up",
  distance,
  animateOnMount = true,
  initial = "hidden",
  animate = animateOnMount ? "visible" : undefined,
  exit = "exit",
  variants: variantsProp,
  ...props
}: SlideProps) {
  const { reduced } = useMotionConfig();
  const variants = useMemo(
    () => variantsProp ?? createSlideVariants(direction, { reduced, distance }),
    [variantsProp, direction, reduced, distance]
  );

  return (
    <motion.div
      className={cn("jds-motion-slide", className)}
      variants={variants}
      initial={initial}
      animate={animate}
      exit={exit}
      {...props}
    />
  );
}
