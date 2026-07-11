"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { createRevealVariants, revealViewportOptions, type RevealOptions } from "../reveal";
import type { SlideDirection } from "../types";
import { useMotionConfig } from "../useMotionConfig";

export type RevealProps = HTMLMotionProps<"div"> &
  Pick<RevealOptions, "once" | "margin" | "amount" | "distance"> & {
    direction?: SlideDirection;
  };

/** Scroll-triggered reveal — opacity + directional offset. */
export function Reveal({
  className,
  direction = "up",
  distance,
  once = true,
  margin,
  amount,
  initial = "hidden",
  whileInView = "visible",
  viewport: viewportProp,
  variants: variantsProp,
  ...props
}: RevealProps) {
  const { reduced } = useMotionConfig();
  const variants = useMemo(
    () => variantsProp ?? createRevealVariants({ reduced, direction, distance }),
    [variantsProp, reduced, direction, distance]
  );
  const viewport = useMemo(
    () => viewportProp ?? revealViewportOptions({ once, margin, amount }),
    [viewportProp, once, margin, amount]
  );

  return (
    <motion.div
      className={cn("jds-motion-reveal", className)}
      variants={variants}
      initial={reduced ? false : initial}
      whileInView={reduced ? undefined : whileInView}
      viewport={viewport}
      {...props}
    />
  );
}
