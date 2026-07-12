"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { createScaleVariants } from "../scale";
import { useMotionConfig } from "../useMotionConfig";

export type ScaleProps = HTMLMotionProps<"div"> & {
  animateOnMount?: boolean;
};

/** Scale + fade entrance wrapper. */
export function Scale({
  className,
  animateOnMount = true,
  initial = "hidden",
  animate = animateOnMount ? "visible" : undefined,
  exit = "exit",
  variants: variantsProp,
  ...props
}: ScaleProps) {
  const { reduced } = useMotionConfig();
  const variants = useMemo(
    () => variantsProp ?? createScaleVariants({ reduced }),
    [variantsProp, reduced]
  );

  return (
    <motion.div
      className={cn("jds-motion-scale", className)}
      variants={variants}
      initial={initial}
      animate={animate}
      exit={exit}
      {...props}
    />
  );
}
