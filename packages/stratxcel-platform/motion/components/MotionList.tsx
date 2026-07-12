"use client";

import { AnimatePresence, motion, type HTMLMotionProps } from "framer-motion";
import { useMemo, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import {
  createListContainerVariants,
  createListItemVariants,
  createListReorderVariants,
} from "../list-animation";
import { useMotionConfig } from "../useMotionConfig";

export type MotionListProps = HTMLMotionProps<"ul"> & {
  stagger?: number;
  animateOnMount?: boolean;
};

/** Animated list container with staggered children. */
export function MotionList({
  className,
  stagger,
  animateOnMount = true,
  initial = "hidden",
  animate = animateOnMount ? "visible" : undefined,
  exit = "exit",
  variants: variantsProp,
  ...props
}: MotionListProps) {
  const { reduced } = useMotionConfig();
  const variants = useMemo(
    () => variantsProp ?? createListContainerVariants({ reduced, stagger }),
    [variantsProp, reduced, stagger]
  );

  return (
    <motion.ul
      className={cn("jds-motion-list", className)}
      variants={variants}
      initial={initial}
      animate={animate}
      exit={exit}
      {...props}
    />
  );
}

export type MotionListItemProps = HTMLMotionProps<"li"> & {
  itemKey: string;
  distance?: number;
  children: ReactNode;
};

/** Animated list item — wrap with AnimatePresence at list level for exit animations. */
export function MotionListItem({
  className,
  itemKey,
  distance,
  layout = true,
  variants: variantsProp,
  children,
  ...props
}: MotionListItemProps) {
  const { reduced } = useMotionConfig();
  const variants = useMemo(
    () => variantsProp ?? createListItemVariants({ reduced, distance }),
    [variantsProp, reduced, distance]
  );

  return (
    <motion.li
      key={itemKey}
      layout={reduced ? false : layout}
      className={cn("jds-motion-list__item", className)}
      variants={variants}
      {...props}
    >
      {children}
    </motion.li>
  );
}

export type MotionListReorderProps = HTMLMotionProps<"li"> & {
  itemKey: string;
  children: ReactNode;
};

/** List item optimized for reorder / filter with layout animations. */
export function MotionListReorder({
  className,
  itemKey,
  layout = true,
  variants: variantsProp,
  children,
  ...props
}: MotionListReorderProps) {
  const { reduced } = useMotionConfig();
  const variants = useMemo(
    () => variantsProp ?? createListReorderVariants({ reduced }),
    [variantsProp, reduced]
  );

  return (
    <motion.li
      key={itemKey}
      layout={reduced ? false : layout}
      className={cn("jds-motion-list__reorder", className)}
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      {...props}
    >
      {children}
    </motion.li>
  );
}

export { AnimatePresence as MotionListPresence };
