"use client";

import { AnimatePresence, motion, type HTMLMotionProps } from "framer-motion";
import { useMemo, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { createPageVariants } from "../page-transition";
import { useMotionConfig } from "../useMotionConfig";

export type PageTransitionProps = HTMLMotionProps<"div"> & {
  /** Unique key per route — drives AnimatePresence enter/exit */
  pageKey: string;
  children: ReactNode;
};

/** Route-level page transition wrapper with AnimatePresence. */
export function PageTransition({
  className,
  pageKey,
  children,
  initial = "initial",
  animate = "animate",
  exit = "exit",
  variants: variantsProp,
  ...props
}: PageTransitionProps) {
  const { reduced } = useMotionConfig();
  const variants = useMemo(
    () => variantsProp ?? createPageVariants({ reduced }),
    [variantsProp, reduced]
  );

  return (
    <AnimatePresence mode="wait" initial={!reduced}>
      <motion.div
        key={pageKey}
        className={cn("jds-motion-page", className)}
        variants={variants}
        initial={reduced ? false : initial}
        animate={animate}
        exit={reduced ? undefined : exit}
        {...props}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
