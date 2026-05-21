"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { delayedOpacity } from "@/animations/presets";
import { cn } from "@/lib/cn";

type DelayedFadeProps = HTMLMotionProps<"div"> & {
  delay?: number;
};

export function DelayedFade({
  className,
  delay = 0.25,
  children,
  ...props
}: DelayedFadeProps) {
  return (
    <motion.div
      className={cn(className)}
      custom={delay}
      variants={delayedOpacity}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
