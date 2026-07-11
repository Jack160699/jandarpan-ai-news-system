"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { createFadeVariants } from "../fade";
import { useMotionConfig } from "../useMotionConfig";

export type FadeProps = HTMLMotionProps<"div"> & {
  /** When true, animates on mount (default). Set false to control manually. */
  animateOnMount?: boolean;
};

/** Opacity fade wrapper — respects prefers-reduced-motion. */
export function Fade({
  className,
  animateOnMount = true,
  initial = "hidden",
  animate = animateOnMount ? "visible" : undefined,
  exit = "exit",
  variants: variantsProp,
  ...props
}: FadeProps) {
  const { reduced } = useMotionConfig();
  const variants = useMemo(
    () => variantsProp ?? createFadeVariants({ reduced }),
    [variantsProp, reduced]
  );

  return (
    <motion.div
      className={cn("jds-motion-fade", className)}
      variants={variants}
      initial={initial}
      animate={animate}
      exit={exit}
      {...props}
    />
  );
}
