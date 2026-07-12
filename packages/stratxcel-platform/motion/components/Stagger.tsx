"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { createStaggerContainerVariants, createStaggerItemVariants } from "../stagger";
import { useMotionConfig } from "../useMotionConfig";

export type StaggerProps = HTMLMotionProps<"div"> & {
  stagger?: number;
  animateOnMount?: boolean;
};

/** Staggered children container — pair with StaggerItem. */
export function Stagger({
  className,
  stagger,
  animateOnMount = true,
  initial = "hidden",
  animate = animateOnMount ? "visible" : undefined,
  exit = "exit",
  variants: variantsProp,
  ...props
}: StaggerProps) {
  const { reduced } = useMotionConfig();
  const variants = useMemo(
    () => variantsProp ?? createStaggerContainerVariants({ reduced, stagger }),
    [variantsProp, reduced, stagger]
  );

  return (
    <motion.div
      className={cn("jds-motion-stagger", className)}
      variants={variants}
      initial={initial}
      animate={animate}
      exit={exit}
      {...props}
    />
  );
}

export type StaggerItemProps = HTMLMotionProps<"div"> & {
  distance?: number;
};

/** Child item for Stagger — inherits stagger timing from parent. */
export function StaggerItem({
  className,
  distance,
  variants: variantsProp,
  ...props
}: StaggerItemProps) {
  const { reduced } = useMotionConfig();
  const variants = useMemo(
    () => variantsProp ?? createStaggerItemVariants({ reduced, distance }),
    [variantsProp, reduced, distance]
  );

  return (
    <motion.div className={cn("jds-motion-stagger__item", className)} variants={variants} {...props} />
  );
}
