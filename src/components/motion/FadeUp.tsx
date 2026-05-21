"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { fadeUp } from "@/animations/presets";
import { cn } from "@/lib/cn";

type FadeUpProps = HTMLMotionProps<"div"> & {
  delay?: number;
};

export function FadeUp({ className, delay = 0, children, ...props }: FadeUpProps) {
  return (
    <motion.div
      className={cn(className)}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-5% 0px -12% 0px" }}
      transition={{ delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
